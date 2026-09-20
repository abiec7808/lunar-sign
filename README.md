# Lunar Sign 🌕

> **Production-Ready, Self-Hosted Document E-Signature Platform tailored for South African Business**  
> Compliant with the **Electronic Communications and Transactions Act 25 of 2002 ("ECTA")** and the **Protection of Personal Information Act 4 of 2013 ("POPIA")**.

---

## 🚀 Key Features

- **South African Legal Compliance (ECTA 25 of 2002)**:
  - Valid electronic signatures in terms of Section 13(2) & 13(3) of ECTA.
  - Mandatory pre-signing electronic consent gate.
  - Pre-send Schedule 2 exclusion checklist (Wills, Alienation of Land, Long-term Leases > 20 yrs, Bills of Exchange).
  - South African 13-digit ID number validation with full Luhn algorithm checksum.
  - South African 10-digit VAT registration number validation (starts with `4`).
  - ZAR currency formatting (`R 1 234,56`).
- **POPIA 4 of 2013 Built-in**:
  - Signer privacy notices & explicit telemetry consent.
  - Configurable data retention and automatic purge of voided/expired drafts.
  - Subject-access request (`/api/popia/export`) and erasure workflows.
- **Tamper-Evident & Cryptographic Security**:
  - `pdf-lib` server-side percentage coordinate stamping and PDF flattening.
  - SHA-256 cryptographic hashing of canonical and finalized documents.
  - Appended official **Signature Certificate** with chronological audit trail (UTC and SAST) and embedded QR code.
  - Public verification portal at `/verify/[documentId]` (inspect hash match without exposing private document content).
  - Pluggable PAdES X.509 digital certificate module.
- **Interactive Drag-and-Drop Editor**:
  - Multi-page PDF canvas powered by `@dnd-kit`.
  - 15 field types with multi-recipient color coding and sender pre-fill ("Me first" step).
- **Mobile-First 3-Tab Signature Experience**:
  - **Draw**: HTML5 Canvas with smooth stroke tracking and clear button.
  - **Type**: 4 self-hosted offline handwriting fonts (*Dancing Script*, *Great Vibes*, *Caveat*, *Sacramento*).
  - **Upload**: PNG/JPG wet signature upload with automatic background transparency removal.
  - Step-by-step "Next Field" guided navigator.
- **Enterprise & White-Label Branding**:
  - Dynamic runtime CSS color variables (`--primary`, `--accent`, `--foreground`).
  - Custom logo and favicon upload.
  - Custom email templates with merge tags (`{{recipient_name}}`, `{{document_title}}`, etc.).
  - Custom domain CNAME support (e.g. `sign.lunaposgeorge.co.za`).
  - TOTP 2FA admin authentication, brute force rate-limiting, and HaveIBeenPwned breach checking.
  - REST API (API key authenticated) & HMAC-SHA256 signed webhooks.

---

## 🛠 Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript & React Server Components
- **Styling**: Tailwind CSS + Radix UI / shadcn components
- **Database & Storage**: Supabase (Postgres, Supabase Auth, Private Storage, Row Level Security)
- **PDF Engine**: `pdfjs-dist` (Browser rendering) & `pdf-lib` (Server-side stamping, flattening, and certificate generation)
- **Document Conversion**: Abstracted `convertToPdf()` service (DOCX/DOC/Images -> PDF)
- **Email**: Resend (Transactional) + React Email templates with fallback logging
- **Validation**: Zod schema validation on all API endpoints
- **Dates**: `date-fns` & `date-fns-tz` (Stored in UTC, rendered in `Africa/Johannesburg` SAST)
- **Handwriting Fonts**: Bundled self-hosted TTF/WOFF2 font assets in `public/fonts/`

---

## 📦 Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/lunar-sign.git
cd lunar-sign
npm install
```

### 2. Environment Variables Configuration
Copy the sample environment file:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials, Resend API key, and application secrets in `.env.local`.

### 3. Database Migrations (Supabase)
Run the SQL migration scripts in your Supabase SQL Editor or via Supabase CLI:
1. `supabase/migrations/20260920000001_initial_schema.sql` (Creates all tables, custom types, and indexes)
2. `supabase/migrations/20260920000002_rls_policies.sql` (Applies RLS policies and immutable audit triggers)
3. `supabase/seed.sql` (Seeds default demo organisation and sample SLA template)

### 4. Bootstrap Initial Admin User
Run the server-side admin seeding script:
```bash
npx tsx scripts/seed-admin.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 South African ECTA 25 of 2002 Legal Framework

Under **Section 13 of ECTA**, electronic signatures are legally recognised in South Africa where:
1. A method is used to identify the signatory and indicate approval of the communicated information.
2. The method is as reliable as appropriate for the purpose of the communication.
3. Signatories expressly consented to transact electronically.

### Excluded Transactions (Schedule 2):
Lunar Sign enforces a pre-upload certification check to ensure excluded agreements (Wills, Alienation of Land, Long-term Leases > 20 yrs, Bills of Exchange) are not processed electronically.

---

## 📄 License
Commercial License — Computer Home Services t/a LunarPOS George.
