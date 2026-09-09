import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('facets')
  facets() {
    return this.contactsService.facets();
  }

  @Get()
  list(
    @Query('q') q?: string,
    @Query('title') title?: string,
    @Query('company') company?: string,
    @Query('location') location?: string,
    @Query('industry') industry?: string,
    @Query('hasEmail') hasEmail?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.contactsService.list({
      q,
      title,
      company,
      location,
      industry,
      hasEmail,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const contact = await this.contactsService.getById(id);
    if (!contact) throw new NotFoundException('Contact not found.');
    return contact;
  }
}
