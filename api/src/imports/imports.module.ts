import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [GoogleModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
