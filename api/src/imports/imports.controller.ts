import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { ImportsService } from './imports.service';
import { ColumnMapping } from './mapping';

const upload = {
  storage: memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
};

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', upload))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.importsService.preview(file);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', upload))
  importDataset(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingRaw: string,
    @Body('mode') modeRaw: string,
  ) {
    let mapping: ColumnMapping;
    try {
      mapping = JSON.parse(mappingRaw || '{}') as ColumnMapping;
    } catch {
      throw new BadRequestException('mapping must be JSON.');
    }

    const mode = modeRaw === 'merge' ? 'merge' : 'replace';
    return this.importsService.importFile(file, mapping, mode, req.user?.id);
  }
}
