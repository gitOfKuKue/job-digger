import { randomBytes } from 'crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { AuthService } from '../auth/auth.service';
import {
  htmlToText,
  looksLikeHtml,
  wrapEmailHtml,
} from '../lib/html';
import { resolveContentType } from './mime';

export type MailAttachment = {
  filename: string;
  contentType: string;
  buffer: Buffer;
};

function encodeSubject(subject: string) {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
}

function gmailErrorMessage(error: unknown) {
  const err = error as {
    message?: string;
    response?: { data?: { error?: { message?: string } | string } };
  };
  const data = err.response?.data?.error;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && data.message) return data.message;
  return err.message || 'Gmail send failed.';
}

function wrapBase64(value: string) {
  return value.replace(/(.{76})/g, '$1\r\n').trim();
}

function sanitizeMime(type: string) {
  const cleaned = type.split(';')[0]?.trim().toLowerCase() || '';
  if (/^[a-z0-9][\w!#$&^.+-]*\/[a-z0-9][\w!#$&^.+-]*$/i.test(cleaned)) {
    return cleaned;
  }
  return 'application/octet-stream';
}

function asciiFilename(filename: string) {
  const base = filename.replace(/[\r\n"]/g, '').trim() || 'attachment';
  return base.replace(/[^\x20-\x7e]/g, '_');
}

function contentDisposition(filename: string) {
  const ascii = asciiFilename(filename);
  const encoded = encodeURIComponent(filename).replace(
    /[()']/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

@Injectable()
export class GmailService {
  constructor(private readonly authService: AuthService) {}

  async send(
    userId: string,
    to: string,
    subject: string,
    body: string,
    attachments: MailAttachment[] = [],
  ) {
    const user = await this.authService.getUserRecord(userId);
    if (!user?.refreshToken && !user?.accessToken) {
      throw new UnauthorizedException('Connect Gmail before sending email.');
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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const from = user.email;
    const raw = this.encodeMessage({ from, to, subject, body, attachments });

    try {
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });
      return result.data.id || null;
    } catch (error) {
      throw new BadRequestException(gmailErrorMessage(error));
    }
  }

  private encodeMessage(input: {
    from: string;
    to: string;
    subject: string;
    body: string;
    attachments: MailAttachment[];
  }) {
    const html = looksLikeHtml(input.body);
    const plain = html ? htmlToText(input.body) : input.body;
    const htmlBody = html ? wrapEmailHtml(input.body) : '';

    if (!input.attachments.length && !html) {
      const lines = [
        `From: ${input.from}`,
        `To: ${input.to}`,
        `Subject: ${encodeSubject(input.subject)}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        input.body,
      ];
      return Buffer.from(lines.join('\r\n')).toString('base64url');
    }

    if (!input.attachments.length) {
      const alt = `=_JobDiggerAlt_${randomBytes(8).toString('hex')}`;
      const lines = [
        `From: ${input.from}`,
        `To: ${input.to}`,
        `Subject: ${encodeSubject(input.subject)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${alt}"`,
        '',
        ...this.alternativeParts(plain, htmlBody, alt),
      ];
      return Buffer.from(lines.join('\r\n')).toString('base64url');
    }

    const mixed = `=_JobDigger_${randomBytes(12).toString('hex')}`;
    const alt = `=_JobDiggerAlt_${randomBytes(8).toString('hex')}`;
    const parts = [
      `From: ${input.from}`,
      `To: ${input.to}`,
      `Subject: ${encodeSubject(input.subject)}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${mixed}"`,
      '',
      `--${mixed}`,
    ];

    if (html) {
      parts.push(
        `Content-Type: multipart/alternative; boundary="${alt}"`,
        '',
        ...this.alternativeParts(plain, htmlBody, alt),
      );
    } else {
      parts.push(...this.textPart(plain));
    }

    for (const file of input.attachments) {
      const mime = sanitizeMime(
        resolveContentType(file.filename, file.contentType),
      );
      const name = asciiFilename(file.filename);
      parts.push(
        `--${mixed}`,
        `Content-Type: ${mime}; name="${name}"`,
        `Content-Disposition: attachment; ${contentDisposition(file.filename)}`,
        'Content-Transfer-Encoding: base64',
        '',
        wrapBase64(file.buffer.toString('base64')),
      );
    }

    parts.push(`--${mixed}--`, '');
    return Buffer.from(parts.join('\r\n')).toString('base64url');
  }

  private textPart(plain: string) {
    return [
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(Buffer.from(plain, 'utf8').toString('base64')),
    ];
  }

  private alternativeParts(plain: string, html: string, boundary?: string) {
    const alt = boundary || `=_JobDiggerAlt_${randomBytes(8).toString('hex')}`;
    return [
      `--${alt}`,
      ...this.textPart(plain),
      `--${alt}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      wrapBase64(Buffer.from(html, 'utf8').toString('base64')),
      `--${alt}--`,
    ];
  }
}
