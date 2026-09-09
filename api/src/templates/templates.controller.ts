import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFiles,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
} from '../lib/attachment-limits';
import { MulterExceptionFilter } from '../messages/multer-exception.filter';
import { TemplatesService } from './templates.service';

const attachmentsUpload = FilesInterceptor('attachments', MAX_ATTACHMENTS, {
  storage: memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_ATTACHMENTS },
  fileFilter: (_req, _file, callback) => callback(null, true),
});

type TemplateBody = {
  name?: string;
  subject?: string;
  body?: string;
  keepAttachmentIds?: string | string[];
};

function parseKeepIds(raw: TemplateBody['keepAttachmentIds']) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* comma-separated fallback */
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list() {
    return this.templatesService.list();
  }

  @Get(':id/files/:fileId')
  @Header('Cache-Control', 'private, no-store')
  async getFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    const file = await this.templatesService.getFile(id, fileId);
    const ascii = file.filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${ascii}"`,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.templatesService.getById(id);
  }

  @Post()
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(attachmentsUpload)
  create(
    @Body() body: TemplateBody,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    return this.templatesService.create(body, files || []);
  }

  @Patch(':id')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(attachmentsUpload)
  update(
    @Param('id') id: string,
    @Body() body: TemplateBody,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
  ) {
    return this.templatesService.update(
      id,
      {
        name: body.name,
        subject: body.subject,
        body: body.body,
        keepAttachmentIds: parseKeepIds(body.keepAttachmentIds),
      },
      files || [],
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
