import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MailAttachment } from '../messages/gmail.service';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateAttachmentsStore } from './template-attachments.store';

const DEFAULT_TEMPLATES = [
  {
    name: 'Intro',
    subject: 'Hello from {{name}} — interest in {{company}}',
    body: `Hi {{name}},

I came across {{company}} and wanted to reach out about {{title}}.

I'd welcome a short conversation if you're open to it.

Thanks,
`,
  },
  {
    name: 'Role outreach',
    subject: '{{title}} at {{company}}',
    body: `Hi {{name}},

I'm writing about the {{title}} work at {{company}}. I'd like to connect and share a bit of context on how I might help.

Best,
`,
  },
];

@Injectable()
export class TemplatesService {
  private readonly files = new TemplateAttachmentsStore();

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const count = await this.prisma.template.count();
    if (count === 0) {
      await this.prisma.template.createMany({ data: DEFAULT_TEMPLATES });
    }
    const templates = await this.prisma.template.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(templates.map((template) => this.withFiles(template)));
  }

  async getById(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template not found.');
    return this.withFiles(template);
  }

  async create(
    input: { name?: string; subject?: string; body?: string },
    files: Express.Multer.File[] = [],
  ) {
    const name = (input.name || '').trim();
    if (!name) throw new BadRequestException('Template name is required.');
    const template = await this.prisma.template.create({
      data: {
        name,
        subject: input.subject?.trim() || '',
        body: input.body || '',
      },
    });
    if (files.length) {
      await this.files.replace(template.id, [], files);
    }
    return this.withFiles(template);
  }

  async update(
    id: string,
    input: {
      name?: string;
      subject?: string;
      body?: string;
      keepAttachmentIds?: string[] | undefined;
    },
    files: Express.Multer.File[] = [],
  ) {
    await this.getById(id);
    const data: { name?: string; subject?: string; body?: string } = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new BadRequestException('Template name is required.');
      data.name = name;
    }
    if (input.subject !== undefined) data.subject = input.subject;
    if (input.body !== undefined) data.body = input.body;
    const template = await this.prisma.template.update({ where: { id }, data });
    if (input.keepAttachmentIds !== undefined || files.length > 0) {
      await this.files.replace(id, input.keepAttachmentIds, files);
    }
    return this.withFiles(template);
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.template.delete({ where: { id } });
    await this.files.removeAll(id);
    return { ok: true };
  }

  async readMailAttachments(templateId: string): Promise<MailAttachment[]> {
    return this.files.readAll(templateId);
  }

  async getFile(templateId: string, fileId: string): Promise<MailAttachment> {
    await this.getById(templateId);
    return this.files.getFile(templateId, fileId);
  }

  private async withFiles<T extends { id: string }>(template: T) {
    return {
      ...template,
      attachments: await this.files.list(template.id),
    };
  }
}
