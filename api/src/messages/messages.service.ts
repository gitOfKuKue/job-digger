import { basename } from 'path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  MAX_ATTACHMENTS,
} from '../lib/attachment-limits';
import { interpolate } from '../lib/interpolate';
import { isEmptyHtml } from '../lib/html';
import { ContactsService } from '../contacts/contacts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TemplatesService } from '../templates/templates.service';
import { GmailService, type MailAttachment } from './gmail.service';
import { resolveContentType } from './mime';

export { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_TOTAL_BYTES };

function safeFilename(original: string) {
  const name = basename(original).replace(/[\r\n]/g, '').trim();
  return name || 'attachment';
}

const ATTACHMENT_NOTE =
  /\n\n\[(\d+) attachment(?:s)?: ([^\]]+)\]$/;

function parseStoredAttachments(body: string) {
  const match = body.match(ATTACHMENT_NOTE);
  if (!match) {
    return { body, attachments: [] as { filename: string }[] };
  }
  return {
    body: body.slice(0, match.index),
    attachments: match[2].split(', ').map((filename) => ({ filename })),
  };
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gmailService: GmailService,
    private readonly contactsService: ContactsService,
    private readonly templatesService: TemplatesService,
  ) {}

  async list(page = 1, pageSize = 25) {
    const safePage = Math.max(1, page);
    const safeSize = Math.min(100, Math.max(1, pageSize));
    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeSize,
        take: safeSize,
        include: {
          contact: {
            select: { id: true, name: true, company: true, title: true },
          },
        },
      }),
      this.prisma.message.count(),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        ...parseStoredAttachments(item.body),
      })),
      total,
      page: safePage,
      pageSize: safeSize,
      pageCount: Math.max(1, Math.ceil(total / safeSize)),
    };
  }

  async send(
    userId: string,
    input: { contactId: string; subject: string; body: string },
    files: Express.Multer.File[] = [],
    extraAttachments: MailAttachment[] = [],
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: input.contactId },
    });
    if (!contact) throw new NotFoundException('Contact not found.');
    if (!contact.email) {
      throw new BadRequestException('This contact has no email address.');
    }

    const subject = input.subject.trim();
    const body = input.body.trim();
    if (!subject || isEmptyHtml(body)) {
      throw new BadRequestException('Subject and body are required.');
    }

    const attachments = [
      ...this.normalizeFiles(files),
      ...extraAttachments,
    ];
    const attachmentNote =
      attachments.length > 0
        ? `\n\n[${attachments.length} attachment${attachments.length === 1 ? '' : 's'}: ${attachments.map((file) => file.filename).join(', ')}]`
        : '';

    const record = await this.prisma.message.create({
      data: {
        contactId: contact.id,
        userId,
        to: contact.email,
        subject,
        body: `${body}${attachmentNote}`,
        status: 'draft',
      },
    });

    try {
      const gmailId = await this.gmailService.send(
        userId,
        contact.email,
        subject,
        body,
        attachments,
      );
      const updated = await this.prisma.message.update({
        where: { id: record.id },
        data: {
          status: 'sent',
          gmailId,
          sentAt: new Date(),
          error: null,
        },
        include: {
          contact: {
            select: { id: true, name: true, company: true, title: true },
          },
        },
      });
      return {
        ...updated,
        ...parseStoredAttachments(updated.body),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send email.';
      await this.prisma.message.update({
        where: { id: record.id },
        data: { status: 'failed', error: message },
      });
      throw error;
    }
  }

  async bulkSend(
    userId: string,
    input: {
      templateId?: string;
      contactIds?: string[];
      q?: string;
      title?: string;
      company?: string;
      location?: string;
      industry?: string;
    },
  ) {
    const templateId = input.templateId?.trim();
    if (!templateId) {
      throw new BadRequestException('Choose a template.');
    }
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found.');
    if (!template.subject.trim() || isEmptyHtml(template.body)) {
      throw new BadRequestException(
        'This template needs a subject and body before sending.',
      );
    }

    const contacts = await this.contactsService.findForMailing({
      ids: input.contactIds,
      q: input.q,
      title: input.title,
      company: input.company,
      location: input.location,
      industry: input.industry,
    });
    if (contacts.length === 0) {
      throw new BadRequestException(
        'No contacts with email match this send. Adjust filters or import emails.',
      );
    }

    const results: {
      contactId: string;
      to: string;
      status: 'sent' | 'failed';
      error?: string;
    }[] = [];

    for (const [index, contact] of contacts.entries()) {
      const values = {
        name: contact.name || contact.company || '',
        title: contact.title || '',
        company: contact.company || '',
      };
      const subject = interpolate(template.subject, values).trim();
      const body = interpolate(template.body, values);
      try {
        if (!subject || isEmptyHtml(body)) {
          throw new Error('Subject or body was empty after filling the template.');
        }
        const attachments =
          await this.templatesService.readMailAttachments(template.id);
        await this.send(
          userId,
          {
            contactId: contact.id,
            subject,
            body,
          },
          [],
          attachments,
        );
        results.push({
          contactId: contact.id,
          to: contact.email || '',
          status: 'sent',
        });
      } catch (error) {
        results.push({
          contactId: contact.id,
          to: contact.email || '',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Send failed.',
        });
      }
      if (index < contacts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return {
      templateId: template.id,
      templateName: template.name,
      total: contacts.length,
      sent: results.filter((item) => item.status === 'sent').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results,
    };
  }

  private normalizeFiles(files: Express.Multer.File[]): MailAttachment[] {
    if (files.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(
        `You can attach up to ${MAX_ATTACHMENTS} files.`,
      );
    }

    let total = 0;
    const attachments: MailAttachment[] = [];

    for (const file of files) {
      const filename = safeFilename(file.originalname);
      const buffer = file.buffer ?? Buffer.alloc(0);
      if (file.size > MAX_ATTACHMENT_BYTES || buffer.length > MAX_ATTACHMENT_BYTES) {
        throw new BadRequestException(`${filename} is larger than 10 MB.`);
      }
      total += Math.max(file.size, buffer.length);
      if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
        throw new BadRequestException(
          'Attachments together must be 15 MB or smaller.',
        );
      }
      attachments.push({
        filename,
        contentType: resolveContentType(filename, file.mimetype),
        buffer,
      });
    }

    return attachments;
  }
}
