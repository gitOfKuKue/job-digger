import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contacts.module';
import { TemplatesModule } from '../templates/templates.module';
import { GmailService } from './gmail.service';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [AuthModule, ContactsModule, TemplatesModule],
  controllers: [MessagesController],
  providers: [MessagesService, GmailService],
})
export class MessagesModule {}
