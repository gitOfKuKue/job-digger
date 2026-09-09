import {
  BadRequestException,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSheetsService } from '../google/google-sheets.service';
import {
  applyMapping,
  CanonicalField,
  CANONICAL_FIELDS,
  ColumnMapping,
  isEmptyContact,
  MappedContact,
  suggestMapping,
} from './mapping';

export type ParsedTable = {
  headers: string[];
  rows: Record<string, unknown>[];
};

function sheetSyncError(error: unknown) {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(' ') : message;
    }
  }
  if (error instanceof Error) return error.message;
  return 'Could not save contacts to Google Sheets.';
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleSheets: GoogleSheetsService,
  ) {}

  preview(file: Express.Multer.File) {
    const table = this.parseFile(file);
    const mapping = suggestMapping(table.headers);
    return {
      filename: file.originalname,
      headers: table.headers,
      rowCount: table.rows.length,
      sampleRows: table.rows.slice(0, 8),
      mapping,
      fields: CANONICAL_FIELDS,
    };
  }

  async importFile(
    file: Express.Multer.File,
    mapping: ColumnMapping,
    mode: 'replace' | 'merge',
    userId?: string,
  ) {
    this.assertMapping(mapping);
    const table = this.parseFile(file);
    const contacts = table.rows
      .map((row) => applyMapping(row, mapping))
      .filter((row) => !isEmptyContact(row));

    if (mode === 'replace') {
      await this.prisma.$transaction([
        this.prisma.message.deleteMany(),
        this.prisma.contact.deleteMany(),
      ]);
    }

    const job = await this.prisma.importJob.create({
      data: {
        filename: file.originalname,
        rowCount: contacts.length,
        mapping: JSON.stringify(mapping),
        mode,
      },
    });

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of contacts) {
      if (mode === 'merge') {
        const existing = await this.findMergeTarget(contact);
        if (existing) {
          await this.prisma.contact.update({
            where: { id: existing.id },
            data: this.toRecord(contact, job.id),
          });
          updated += 1;
          continue;
        }
      }

      await this.prisma.contact.create({
        data: this.toRecord(contact, job.id),
      });
      created += 1;
    }

    if (contacts.length === 0) skipped = table.rows.length;

    const stored = await this.prisma.contact.findMany({
      orderBy: [{ company: 'asc' }, { name: 'asc' }],
    });

    let googleSheet: {
      ok: boolean;
      url: string;
      rowCount?: number;
      error?: string;
    } = {
      ok: false,
      url: this.googleSheets.spreadsheetUrl(),
    };

    try {
      const synced = await this.googleSheets.syncContacts(userId, stored);
      googleSheet = synced;
    } catch (error) {
      googleSheet = {
        ok: false,
        url: this.googleSheets.spreadsheetUrl(),
        error: sheetSyncError(error),
      };
    }

    return {
      importJobId: job.id,
      filename: file.originalname,
      mode,
      created,
      updated,
      skipped,
      total: contacts.length,
      googleSheet,
    };
  }

  parseFile(file?: Express.Multer.File): ParsedTable {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Upload a CSV or JSON file.');
    }

    const name = (file.originalname || '').toLowerCase();
    const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');

    if (name.endsWith('.json') || file.mimetype === 'application/json') {
      return this.parseJson(text);
    }

    if (
      name.endsWith('.csv') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      return this.parseCsv(text);
    }

    try {
      return this.parseJson(text);
    } catch {
      return this.parseCsv(text);
    }
  }

  private parseJson(text: string): ParsedTable {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BadRequestException('Invalid JSON file.');
    }

    let rowsSource: unknown[];
    if (Array.isArray(parsed)) {
      rowsSource = parsed;
    } else if (parsed && typeof parsed === 'object') {
      rowsSource = [parsed];
    } else {
      throw new BadRequestException(
        'JSON must be an array of objects, or a single object.',
      );
    }

    const rows = rowsSource.filter(
      (row) => row && typeof row === 'object' && !Array.isArray(row),
    ) as Record<string, unknown>[];

    const headerSet = new Set<string>();
    for (const row of rows) {
      Object.keys(row).forEach((key) => headerSet.add(key));
    }

    return { headers: [...headerSet], rows };
  }

  private parseCsv(text: string): ParsedTable {
    try {
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        bom: true,
      }) as Record<string, unknown>[];

      const headerSet = new Set<string>();
      for (const row of records) {
        Object.keys(row).forEach((key) => headerSet.add(key));
      }

      return { headers: [...headerSet], rows: records };
    } catch {
      throw new BadRequestException('Could not parse CSV file.');
    }
  }

  private assertMapping(mapping: ColumnMapping) {
    const values = Object.values(mapping).filter(Boolean);
    const unique = new Set(values);
    if (unique.size !== values.length) {
      throw new BadRequestException(
        'Each canonical field can only be mapped from one column.',
      );
    }
    for (const value of values) {
      if (!CANONICAL_FIELDS.includes(value as CanonicalField)) {
        throw new BadRequestException(`Unknown field mapping: ${value}`);
      }
    }
  }

  private async findMergeTarget(contact: MappedContact) {
    if (contact.email) {
      return this.prisma.contact.findFirst({
        where: { email: contact.email },
      });
    }
    if (contact.company || contact.name) {
      return this.prisma.contact.findFirst({
        where: {
          company: contact.company,
          name: contact.name,
          title: contact.title,
        },
      });
    }
    return null;
  }

  private toRecord(contact: MappedContact, importJobId: string) {
    return {
      email: contact.email,
      company: contact.company,
      name: contact.name,
      title: contact.title,
      location: contact.location,
      industry: contact.industry,
      website: contact.website,
      linkedinUrl: contact.linkedinUrl,
      phone: contact.phone,
      extras:
        Object.keys(contact.extras).length > 0
          ? JSON.stringify(contact.extras)
          : null,
      importJobId,
    };
  }
}
