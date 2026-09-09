import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { AuthenticatedGuard } from '../auth/authenticated.guard';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
} from '../lib/attachment-limits';
import { MessagesService } from './messages.service';
import { MulterExceptionFilter } from './multer-exception.filter';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.messagesService.list(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 25,
    );
  }

  @Post('bulk')
  @UseGuards(AuthenticatedGuard)
  bulkSend(
    @Req() req: Request,
    @Body()
    body: {
      templateId?: string;
      contactIds?: string[];
      q?: string;
      title?: string;
      company?: string;
      location?: string;
      industry?: string;
    },
  ) {
    return this.messagesService.bulkSend(req.user!.id, body);
  }

  @Post()
  @UseGuards(AuthenticatedGuard)
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FilesInterceptor('attachments', MAX_ATTACHMENTS, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_ATTACHMENTS },
      fileFilter: (_req, _file, callback) => callback(null, true),
    }),
  )
  send(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() body: { contactId?: string; subject?: string; body?: string },
  ) {
    return this.messagesService.send(
      req.user!.id,
      {
        contactId: body.contactId || '',
        subject: body.subject || '',
        body: body.body || '',
      },
      files || [],
    );
  }
}
