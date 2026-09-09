export type CanonicalField =
  | "email"
  | "company"
  | "name"
  | "title"
  | "location"
  | "industry"
  | "website"
  | "linkedinUrl"
  | "phone";

export const CANONICAL_FIELDS: CanonicalField[] = [
  "email",
  "company",
  "name",
  "title",
  "location",
  "industry",
  "website",
  "linkedinUrl",
  "phone",
];

export const FIELD_LABELS: Record<CanonicalField | "", string> = {
  "": "Ignore (keep in extras)",
  email: "Email",
  company: "Company",
  name: "Name",
  title: "Job title",
  location: "Location",
  industry: "Industry / services",
  website: "Website",
  linkedinUrl: "LinkedIn",
  phone: "Phone",
};

export type Contact = {
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
  extras: Record<string, string>;
  importedAt: string;
};

export type ContactsPage = {
  items: Contact[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type Facets = {
  total: number;
  withEmail: number;
  fields: Record<string, { populated: boolean; distinctCount: number }>;
};

export type AuthMe = {
  user: { id: string; email: string; name?: string | null } | null;
  googleConfigured: boolean;
};

export type ImportPreview = {
  filename: string;
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  mapping: Record<string, CanonicalField | "">;
  fields: CanonicalField[];
};

export type ImportResult = {
  importJobId: string;
  filename: string;
  mode: string;
  created: number;
  updated: number;
  skipped: number;
  total: number;
  googleSheet?: {
    ok: boolean;
    url: string;
    rowCount?: number;
    error?: string;
  };
};

export type TemplateAttachment = {
  id: string;
  filename: string;
  size: number;
  contentType: string;
};

export type OutreachTemplate = {
  id: string;
  name: string;
  subject: string;
  body: string;
  attachments?: TemplateAttachment[];
  createdAt?: string;
  updatedAt?: string;
};

export type BulkSendResult = {
  templateId: string;
  templateName: string;
  total: number;
  sent: number;
  failed: number;
  results: {
    contactId: string;
    to: string;
    status: "sent" | "failed";
    error?: string;
  }[];
};

export type MessageAttachment = {
  filename: string;
};

export type MessageItem = {
  id: string;
  to: string;
  subject: string;
  body: string;
  attachments: MessageAttachment[];
  status: string;
  error: string | null;
  gmailId: string | null;
  sentAt: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string | null;
    company: string | null;
    title: string | null;
  };
};

export type MessagesPage = {
  items: MessageItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
