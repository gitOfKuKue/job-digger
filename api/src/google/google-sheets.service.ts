import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { AuthService } from '../auth/auth.service';

export function contactsSpreadsheetId() {
  return (
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    '1mAIPCCwCVxXf1mLkci4q7HPHpLl1Xer4sOZ0CuBDAcI'
  );
}

export function contactsSheetGid() {
  return Number(process.env.GOOGLE_SHEETS_GID || '1126740483');
}

export function contactsSheetUrl() {
  const id = contactsSpreadsheetId();
  const gid = contactsSheetGid();
  return `https://docs.google.com/spreadsheets/d/${id}/edit?gid=${gid}#gid=${gid}`;
}

const SHEET_HEADERS = [
  'Company',
  'Name',
  'Title',
  'Email',
  'Location',
  'Industry',
  'Phone',
  'Website',
  'LinkedIn',
  'Extras',
] as const;

type ContactRow = {
  email: string | null;
  company: string | null;
  name: string | null;
  title: string | null;
  location: string | null;
  industry: string | null;
  website: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  extras: string | null;
};

function sheetsErrorMessage(error: unknown) {
  const err = error as {
    message?: string;
    response?: { data?: { error?: { message?: string } | string } };
  };
  const data = err.response?.data?.error;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && data.message) return data.message;
  return err.message || 'Google Sheets update failed.';
}

function quoteTitle(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

@Injectable()
export class GoogleSheetsService {
  constructor(private readonly authService: AuthService) {}

  spreadsheetUrl() {
    return contactsSheetUrl();
  }

  async syncContacts(userId: string | undefined, contacts: ContactRow[]) {
    const user = userId
      ? await this.authService.getUserRecord(userId)
      : await this.authService.getAnyConnectedUser();

    if (!user?.refreshToken && !user?.accessToken) {
      throw new UnauthorizedException(
        'Connect Google (Disconnect, then Connect Gmail) so imports can be saved to the spreadsheet. The account needs Editor access on the sheet.',
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );
    oauth2Client.setCredentials({
      access_token: user.accessToken || undefined,
      refresh_token: user.refreshToken || undefined,
      expiry_date: user.tokenExpiry?.getTime(),
    });
    oauth2Client.on('tokens', async (tokens) => {
      await this.authService.updateTokens(user.id, {
        accessToken: tokens.access_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
      });
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    try {
      const meta = await sheets.spreadsheets.get({
        spreadsheetId: contactsSpreadsheetId(),
        fields: 'sheets.properties',
      });
      const tab = meta.data.sheets?.find(
        (item) => item.properties?.sheetId === contactsSheetGid(),
      );
      const title = tab?.properties?.title;
      if (!title) {
        throw new BadRequestException(
          `Spreadsheet tab gid=${contactsSheetGid()} was not found. Check the Google Sheet URL.`,
        );
      }

      const range = quoteTitle(title);
      const values: string[][] = [
        [...SHEET_HEADERS],
        ...contacts.map((contact) => [
          contact.company || '',
          contact.name || '',
          contact.title || '',
          contact.email || '',
          contact.location || '',
          contact.industry || '',
          contact.phone || '',
          contact.website || '',
          contact.linkedinUrl || '',
          contact.extras || '',
        ]),
      ];

      await sheets.spreadsheets.values.clear({
        spreadsheetId: contactsSpreadsheetId(),
        range,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: contactsSpreadsheetId(),
        range: `${range}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      return {
        ok: true as const,
        url: contactsSheetUrl(),
        rowCount: contacts.length,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      const message = sheetsErrorMessage(error);
      if (/has not been used in project|is disabled/i.test(message)) {
        throw new BadRequestException(
          'Enable the Google Sheets API for this Google Cloud project, then try importing again.',
        );
      }
      if (/insufficient|permission|forbidden/i.test(message)) {
        throw new BadRequestException(
          'The connected Google account cannot edit this spreadsheet. Share it with that account as Editor, reconnect Google, and import again.',
        );
      }
      throw new BadRequestException(message);
    }
  }
}
