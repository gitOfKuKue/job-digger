import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleSheetsService } from './google-sheets.service';

@Module({
  imports: [AuthModule],
  providers: [GoogleSheetsService],
  exports: [GoogleSheetsService],
})
export class GoogleModule {}
