import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ContactsQuery = {
  q?: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  hasEmail?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ContactsQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 25));
    const where = this.buildWhere(query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where,
        orderBy: [{ company: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      items: items.map((item) => this.serialize(item)),
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async facets() {
    const total = await this.prisma.contact.count();
    const withEmail = await this.prisma.contact.count({
      where: { email: { not: null } },
    });

    const fields = ['title', 'company', 'location', 'industry'] as const;
    const fieldStats: Record<
      string,
      { populated: boolean; distinctCount: number }
    > = {};

    for (const field of fields) {
      const populated = await this.prisma.contact.count({
        where: { [field]: { not: null } },
      });
      const grouped = await this.prisma.contact.groupBy({
        by: [field],
        where: { [field]: { not: null } },
      });
      fieldStats[field] = {
        populated: populated > 0,
        distinctCount: grouped.length,
      };
    }

    return { total, withEmail, fields: fieldStats };
  }

  async getById(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    return contact ? this.serialize(contact) : null;
  }

  async findForMailing(input: {
    ids?: string[];
    q?: string;
    title?: string;
    company?: string;
    location?: string;
    industry?: string;
    limit?: number;
  }) {
    const take = Math.min(100, Math.max(1, input.limit || 100));
    const emailWhere: Prisma.ContactWhereInput = {
      email: { not: null },
    };
    const filters = this.buildWhere({
      q: input.q,
      title: input.title,
      company: input.company,
      location: input.location,
      industry: input.industry,
    });

    const where: Prisma.ContactWhereInput = input.ids?.length
      ? { AND: [emailWhere, { id: { in: input.ids } }] }
      : Object.keys(filters).length
        ? { AND: [emailWhere, filters] }
        : emailWhere;

    return this.prisma.contact.findMany({
      where,
      take,
      orderBy: [{ company: 'asc' }, { name: 'asc' }],
    });
  }

  serialize(contact: {
    id: string;
    email: string | null;
    company: string | null;
    name: string | null;
    title: string | null;
    location: string | null;
    industry: string | null;
    website: string | null;
    linkedinUrl: string | null;
    phone: string | null;
    extras: string | null;
    importedAt: Date;
  }) {
    return {
      ...contact,
      extras: contact.extras ? (JSON.parse(contact.extras) as Record<string, string>) : {},
    };
  }

  private buildWhere(query: ContactsQuery): Prisma.ContactWhereInput {
    const and: Prisma.ContactWhereInput[] = [];

    if (query.q?.trim()) {
      const q = query.q.trim();
      and.push({
        OR: [
          { name: { contains: q } },
          { company: { contains: q } },
          { title: { contains: q } },
          { email: { contains: q } },
          { location: { contains: q } },
          { industry: { contains: q } },
        ],
      });
    }

    if (query.title?.trim()) {
      and.push({ title: { contains: query.title.trim() } });
    }
    if (query.company?.trim()) {
      and.push({ company: { contains: query.company.trim() } });
    }
    if (query.location?.trim()) {
      and.push({ location: { contains: query.location.trim() } });
    }
    if (query.industry?.trim()) {
      and.push({ industry: { contains: query.industry.trim() } });
    }
    if (query.hasEmail === 'true') {
      and.push({ email: { not: null } });
    }

    return and.length ? { AND: and } : {};
  }
}
