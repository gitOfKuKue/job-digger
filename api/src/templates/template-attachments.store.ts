import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, rm, unlink, writeFile } from 'fs/promises';
import { basename, join } from 'path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  MAX_ATTACHMENTS,
} from '../lib/attachment-limits';
import type { MailAttachment } from '../messages/gmail.service';
import { resolveContentType } from '../messages/mime';

export type TemplateAttachmentMeta = {
  id: string;
  filename: string;
  size: number;
  contentType: string;
};

type StoredFile = TemplateAttachmentMeta & { storedName: string };

type Manifest = { files: StoredFile[] };

function safeFilename(original: string) {
  const name = basename(original).replace(/[\r\n]/g, '').trim();
  return name || 'attachment';
}

function uploadsRoot() {
  return join(__dirname, '..', '..', 'uploads', 'templates');
}

export class TemplateAttachmentsStore {
  private dir(templateId: string) {
    return join(uploadsRoot(), templateId);
  }

  private manifestPath(templateId: string) {
    return join(this.dir(templateId), 'manifest.json');
  }

  async list(templateId: string): Promise<TemplateAttachmentMeta[]> {
    const files = await this.readManifest(templateId);
    return files.map(({ storedName: _storedName, ...meta }) => meta);
  }

  async readAll(templateId: string): Promise<MailAttachment[]> {
    const files = await this.readManifest(templateId);
    const attachments: MailAttachment[] = [];
    for (const file of files) {
      attachments.push(await this.readOne(templateId, file));
    }
    return attachments;
  }

  async getFile(templateId: string, fileId: string): Promise<MailAttachment> {
    const files = await this.readManifest(templateId);
    const file = files.find((item) => item.id === fileId);
    if (!file) throw new NotFoundException('Attachment not found.');
    return this.readOne(templateId, file);
  }

  async replace(
    templateId: string,
    keepIds: string[] | undefined,
    incoming: Express.Multer.File[],
  ): Promise<TemplateAttachmentMeta[]> {
    const current = await this.readManifest(templateId);
    const keep =
      keepIds === undefined
        ? current
        : current.filter((file) => keepIds.includes(file.id));
    const removed = current.filter(
      (file) => !keep.some((item) => item.id === file.id),
    );

    this.assertLimits(keep, incoming);

    const dir = this.dir(templateId);
    await mkdir(dir, { recursive: true });

    for (const file of removed) {
      await unlink(join(dir, file.storedName)).catch(() => undefined);
    }

    const next: StoredFile[] = [...keep];
    for (const file of incoming) {
      const filename = safeFilename(file.originalname);
      const id = randomUUID();
      const storedName = `${id}-${filename}`.replace(/[/\\]/g, '_');
      const buffer = file.buffer ?? Buffer.alloc(0);
      await writeFile(join(dir, storedName), buffer);
      next.push({
        id,
        filename,
        storedName,
        size: buffer.length,
        contentType: resolveContentType(filename, file.mimetype),
      });
    }

    await writeFile(
      this.manifestPath(templateId),
      JSON.stringify({ files: next } satisfies Manifest),
    );
    return next.map(({ storedName: _storedName, ...meta }) => meta);
  }

  async removeAll(templateId: string) {
    await rm(this.dir(templateId), { recursive: true, force: true });
  }

  private async readOne(
    templateId: string,
    file: StoredFile,
  ): Promise<MailAttachment> {
    const buffer = await readFile(join(this.dir(templateId), file.storedName));
    return {
      filename: file.filename,
      contentType: file.contentType,
      buffer,
    };
  }

  private async readManifest(templateId: string): Promise<StoredFile[]> {
    const path = this.manifestPath(templateId);
    if (!existsSync(path)) return [];
    try {
      const raw = await readFile(path, 'utf8');
      const parsed = JSON.parse(raw) as Manifest;
      return Array.isArray(parsed.files) ? parsed.files : [];
    } catch {
      return [];
    }
  }

  private assertLimits(
    kept: StoredFile[],
    incoming: Express.Multer.File[],
  ) {
    if (kept.length + incoming.length > MAX_ATTACHMENTS) {
      throw new BadRequestException(
        `You can attach up to ${MAX_ATTACHMENTS} files.`,
      );
    }
    let total = kept.reduce((sum, file) => sum + file.size, 0);
    for (const file of incoming) {
      const filename = safeFilename(file.originalname);
      const buffer = file.buffer ?? Buffer.alloc(0);
      if (
        file.size > MAX_ATTACHMENT_BYTES ||
        buffer.length > MAX_ATTACHMENT_BYTES
      ) {
        throw new BadRequestException(`${filename} is larger than 10 MB.`);
      }
      total += Math.max(file.size, buffer.length);
      if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
        throw new BadRequestException(
          'Attachments together must be 15 MB or smaller.',
        );
      }
    }
  }
}
