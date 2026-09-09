# Job Digger

Personal outreach app: import a company/contact dataset, filter by role, and send email from your Gmail.

Go from a spreadsheet of people to a sent email without a paid people-search API.

## What it does

- **Upload** CSV or JSON contacts, map columns, and save them locally. After import, the full table can also sync to a Google Sheet.
- **Directory** lists contacts with sidebar filters (search, title, company, location, industry). Compose one-off mail from a row.
- **Templates** store reusable outreach (subject, rich-text body, file attachments). Bulk send to Directory matches that have an email (up to 100 at a time).
- **Sent** shows mail this app sent through Gmail.

Placeholders in templates: `{{name}}`, `{{title}}`, `{{company}}`.

## Stack

| Part | Tech | Port |
| --- | --- | --- |
| Web | Next.js (App Router) | 3000 |
| API | NestJS | 8080 |
| Data | Prisma + SQLite (`api/prisma/dev.db`) | — |

## Setup

Needs Node.js 20+.

```bash
git clone https://github.com/gitOfKuKue/job-digger.git
cd job-digger
npm install --prefix api
npm install --prefix web
```

### Environment

Copy the examples, then match the ports below.

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

**`api/.env`**

```env
PORT=8080
DATABASE_URL="file:./dev.db"
FRONTEND_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback
SESSION_SECRET=change-me
# Optional: write imported contacts to this spreadsheet tab
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_GID=
```

**`web/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Apply the database schema (SQLite file is created under `api/prisma/`):

```bash
npm run db:generate
cd api && npx prisma migrate deploy && cd ..
```

### Google Cloud (Gmail + Sheets)

1. Create an OAuth client (Web application) on the same Google Cloud project.
2. Authorized redirect URI must be exactly  
   `http://localhost:8080/auth/google/callback`
3. Enable **Gmail API** and **Google Sheets API**.
4. OAuth scopes used: `email`, `profile`, `gmail.send`, `spreadsheets`.
5. Add your Google account as a **test user** on the consent screen while the app is in testing.
6. If you set `GOOGLE_SHEETS_SPREADSHEET_ID`, share that sheet with the connected account as **Editor**.

After changing scopes, disconnect Gmail in the app header and connect again.

## Run

From the repo root (API + web together):

```bash
npm run dev
```

Or separately:

```bash
# API — http://localhost:8080
cd api && npm run start:dev

# Web — http://localhost:3000
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Nest watch does not always reload `.env`; restart the API after env changes.

Sample CSVs live in `datasets/` (including a small send-test file).

## App map

- **Directory** (`/`) — filter contacts, open compose, attach files, send.
- **Templates** (`/templates`) — edit templates (formatting, attachments), bulk send to current Directory filters.
- **Upload** (`/upload`) — import CSV/JSON; merge or replace; optional Google Sheet sync.
- **Sent** (`/sent`) — outreach history.

Compose and templates support bold, italic, underline, lists, links, headings, and alignment. Formatted mail is sent as HTML with a plain-text fallback. Attachments: up to 5 files, 10 MB each, 15 MB total.

## API (Bruno)

Open the `bruno/` folder in [Bruno](https://www.usebruno.com/). Environment: **Local** (`{{baseUrl}}` = `http://localhost:8080`).

Gmail send needs the `jobdigger.sid` session cookie from a browser login (OAuth cannot finish inside Bruno). Run **List Contacts** / **List Templates** first to fill `{{contactId}}` and `{{templateId}}`.

## Project layout

```
api/        NestJS API, Prisma, Gmail/Sheets
web/        Next.js UI
bruno/      HTTP collection
datasets/   Sample CSVs
purpose.md  Product north star
```

## License

Private / personal use.
