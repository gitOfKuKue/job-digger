import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? 'Each attachment must be 10 MB or smaller.'
        : exception.code === 'LIMIT_FILE_COUNT' ||
            exception.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'You can attach up to 5 files.'
          : 'Could not upload attachments.';
    res.status(HttpStatus.BAD_REQUEST).json({ statusCode: 400, message });
  }
}
