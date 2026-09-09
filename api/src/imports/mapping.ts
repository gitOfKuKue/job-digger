export const CANONICAL_FIELDS = [
  'email',
  'company',
  'name',
  'title',
  'location',
  'industry',
  'website',
  'linkedinUrl',
  'phone',
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

export type ColumnMapping = Record<string, CanonicalField | ''>;

const ALIASES: Record<CanonicalField, string[]> = {
  email: ['email', 'e-mail', 'email address', 'mail', 'work email'],
  company: [
    'company',
    'company name',
    'organization',
    'organisation',
    'org',
    'employer',
    'business',
  ],
  name: [
    'full name',
    'contact name',
    'person',
    'person name',
    'first name',
    'contact',
  ],
  title: ['title', 'job title', 'position', 'role', 'job', 'job position'],
  location: ['location', 'address', 'city', 'region', 'country', 'hq'],
  industry: ['industry', 'services', 'sector', 'category', 'vertical'],
  website: ['website', 'url', 'domain', 'site', 'web', 'homepage'],
  linkedinUrl: [
    'linkedin',
    'linkedin profile',
    'linkedin url',
    'linkedinurl',
  ],
  phone: [
    'phone',
    'telephone',
    'contact number',
    'contact number (+1)',
    'mobile',
    'tel',
    'phone number',
  ],
};

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<CanonicalField>();
  const columns = headers.map((raw) => ({ raw, key: normalizeHeader(raw) }));

  for (const field of CANONICAL_FIELDS) {
    for (const col of columns) {
      if (mapping[col.raw]) continue;
      if (used.has(field)) continue;
      if (ALIASES[field].includes(col.key)) {
        mapping[col.raw] = field;
        used.add(field);
      }
    }
  }

  for (const col of columns) {
    if (mapping[col.raw]) continue;
    if (col.key === 'name') {
      if (!used.has('company')) {
        mapping[col.raw] = 'company';
        used.add('company');
      } else if (!used.has('name')) {
        mapping[col.raw] = 'name';
        used.add('name');
      }
    }
  }

  for (const col of columns) {
    if (mapping[col.raw] === undefined) mapping[col.raw] = '';
  }

  return mapping;
}

function cellString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

export type MappedContact = {
  email: string | null;
  company: string | null;
  name: string | null;
  title: string | null;
  location: string | null;
  industry: string | null;
  website: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  extras: Record<string, string>;
};

export function applyMapping(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
): MappedContact {
  const contact: MappedContact = {
    email: null,
    company: null,
    name: null,
    title: null,
    location: null,
    industry: null,
    website: null,
    linkedinUrl: null,
    phone: null,
    extras: {},
  };

  for (const [column, field] of Object.entries(mapping)) {
    const value = cellString(row[column]);
    if (!field) {
      if (value) contact.extras[column] = value;
      continue;
    }
    contact[field] = value;
  }

  return contact;
}

export function isEmptyContact(contact: MappedContact): boolean {
  return (
    !contact.email &&
    !contact.company &&
    !contact.name &&
    !contact.title &&
    !contact.location &&
    !contact.industry &&
    !contact.website &&
    !contact.linkedinUrl &&
    !contact.phone &&
    Object.keys(contact.extras).length === 0
  );
}
