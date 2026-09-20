-- Migration: 20260920000001_initial_schema.sql
-- Lunar Sign Database Schema (ECTA & POPIA Compliant Document E-Signature Platform)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('draft', 'sent', 'partially_signed', 'completed', 'voided', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recipient_role AS ENUM ('signer', 'approver', 'filler', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recipient_status AS ENUM ('pending', 'opened', 'in_progress', 'signed', 'declined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recipient_auth_method AS ENUM ('none', 'access_code', 'email_otp');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE signature_method AS ENUM ('drawn', 'typed', 'uploaded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE actor_type AS ENUM ('admin', 'recipient', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. ORGANISATIONS
CREATE TABLE IF NOT EXISTS organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(30) DEFAULT '#4f46e5',
    accent_color VARCHAR(30) DEFAULT '#06b6d4',
    text_color VARCHAR(30) DEFAULT '#0f172a',
    background_color VARCHAR(30) DEFAULT '#f8fafc',
    email_footer_text TEXT DEFAULT 'Lunar Sign - Powered by Computer Home Services / LunarPOS George. Valid under SA ECTA 25 of 2002.',
    reply_to_email VARCHAR(255) DEFAULT 'support@lunaposgeorge.co.za',
    custom_domain VARCHAR(255),
    retention_days INTEGER DEFAULT 365,
    purge_voided_drafts_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    totp_secret TEXT,
    totp_enabled BOOLEAN NOT NULL DEFAULT false,
    require_password_change BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    original_filename VARCHAR(255) NOT NULL,
    original_mime_type VARCHAR(100) NOT NULL,
    storage_path_original TEXT NOT NULL,
    storage_path_pdf TEXT NOT NULL,
    storage_path_signed TEXT,
    storage_path_certificate TEXT,
    page_count INTEGER NOT NULL DEFAULT 1,
    status document_status NOT NULL DEFAULT 'draft',
    signing_order_enforced BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    reminder_interval_days INTEGER DEFAULT 3,
    last_reminder_sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    voided_reason TEXT,
    original_hash VARCHAR(64),
    final_hash VARCHAR(64),
    pades_signature_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. RECIPIENTS
CREATE TABLE IF NOT EXISTS recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role recipient_role NOT NULL DEFAULT 'signer',
    order_index INTEGER NOT NULL DEFAULT 0,
    status recipient_status NOT NULL DEFAULT 'pending',
    token_hash VARCHAR(64) NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    access_code_hash VARCHAR(64),
    auth_method recipient_auth_method NOT NULL DEFAULT 'none',
    otp_code_hash VARCHAR(64),
    otp_expires_at TIMESTAMPTZ,
    consent_given_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    declined_reason TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    geo_country VARCHAR(100),
    geo_city VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. FIELDS
CREATE TABLE IF NOT EXISTS fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES recipients(id) ON DELETE CASCADE, -- NULL means sender field
    type VARCHAR(50) NOT NULL, -- signature, initials, full_name, email, date_signed, text, number, currency, sa_id, sa_vat, checkbox, radio, dropdown, date_picker, attachment
    page INTEGER NOT NULL DEFAULT 1,
    x_pct NUMERIC(6, 3) NOT NULL,
    y_pct NUMERIC(6, 3) NOT NULL,
    width_pct NUMERIC(6, 3) NOT NULL,
    height_pct NUMERIC(6, 3) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT true,
    label VARCHAR(255),
    placeholder VARCHAR(255),
    default_value TEXT,
    options JSONB, -- For dropdowns, radio buttons
    validation_rule JSONB, -- min, max, regex, Luhn, etc.
    read_only BOOLEAN NOT NULL DEFAULT false,
    value TEXT,
    value_meta JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. SIGNATURES
CREATE TABLE IF NOT EXISTS signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
    method signature_method NOT NULL,
    font_family VARCHAR(100),
    image_storage_path TEXT,
    signature_data TEXT, -- Base64 data if small, or path
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AUDIT_EVENTS (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
    actor_type actor_type NOT NULL DEFAULT 'system',
    event_type VARCHAR(100) NOT NULL, -- document.created, document.sent, document.opened, field.completed, signature.affixed, document.completed, document.declined, document.voided, etc.
    description TEXT NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    geo_country VARCHAR(100),
    geo_city VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TEMPLATES
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    storage_path_pdf TEXT NOT NULL,
    field_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
    recipient_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. EMAIL_LOG
CREATE TABLE IF NOT EXISTS email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES recipients(id) ON DELETE SET NULL,
    template VARCHAR(100) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    provider_message_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    error TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. API_KEYS
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. WEBHOOKS
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. CONTACTS (Address Book)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role recipient_role NOT NULL DEFAULT 'signer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(org_id, email)
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents(org_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_token_hash ON recipients(token_hash);
CREATE INDEX IF NOT EXISTS idx_recipients_document ON recipients(document_id);
CREATE INDEX IF NOT EXISTS idx_fields_document ON fields(document_id);
CREATE INDEX IF NOT EXISTS idx_fields_recipient ON fields(recipient_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_document ON audit_events(document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(org_id, email);
