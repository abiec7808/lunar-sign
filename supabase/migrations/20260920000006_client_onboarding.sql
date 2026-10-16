-- Migration: 20260920000006_client_onboarding.sql
-- Lunar Sign: Client Onboarding Module with Custom Questionnaire Builder, ECTA E-Signature, and Automatic Client List Synchronization

-- 1. Add module flags to organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS client_onboarding_enabled BOOLEAN DEFAULT false;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS client_onboarding_requested BOOLEAN DEFAULT false;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS client_onboarding_requested_at TIMESTAMPTZ;

-- Enable for Super Admin organisation by default
UPDATE organisations
SET client_onboarding_enabled = true
WHERE id = '11111111-1111-1111-1111-111111111111' OR slug = 'lunarpos-george';

-- 2. Onboarding Questionnaire Templates per Business
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Client Onboarding Form',
    description TEXT DEFAULT 'Please complete this onboarding form and provide your details and signature.',
    welcome_heading VARCHAR(255) DEFAULT 'Client Onboarding & Information Form',
    welcome_subheading TEXT DEFAULT 'Please fill in your company and contact information below.',
    declaration_text TEXT DEFAULT 'I confirm that the information provided is accurate and complete, and I am authorized to submit these details on behalf of the registered business under SA ECTA 25 of 2002.',
    require_signature BOOLEAN NOT NULL DEFAULT true,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_org ON onboarding_templates(org_id);

-- 3. Onboarding Submissions / Unique Client Links
CREATE TABLE IF NOT EXISTS onboarding_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'viewed', 'submitted'
    client_id UUID, -- References calc_clients(id) or contacts(id)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    email VARCHAR(255),
    contact_number VARCHAR(50),
    mobile_number VARCHAR(50),
    landline_number VARCHAR(50),
    company_name VARCHAR(255),
    registration_number VARCHAR(100),
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    signature_data_url TEXT,
    signer_declaration_agreed BOOLEAN DEFAULT false,
    signer_ip VARCHAR(100),
    signer_user_agent TEXT,
    viewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_org ON onboarding_submissions(org_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_token ON onboarding_submissions(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_status ON onboarding_submissions(status);

-- 4. Seed default onboarding template for LunarPOS George
DO $$
DECLARE
    v_org_id UUID := '11111111-1111-1111-1111-111111111111';
    v_questions JSONB := '[
        {
            "id": "q1",
            "label": "Primary Line of Business / Industry",
            "type": "select",
            "required": true,
            "placeholder": "Select your industry...",
            "options": ["Retail & Convenience", "Hospitality & Restaurant", "Boutique / Specialty Store", "Wholesale & Distribution", "Services & Repairs", "Other"],
            "helpText": "Helps us configure your system layout correctly"
        },
        {
            "id": "q2",
            "label": "Physical Business Address / Operating Location",
            "type": "textarea",
            "required": true,
            "placeholder": "Shop / Unit number, Street Address, Suburb, City, Postal Code",
            "helpText": "Where hardware or services will be deployed"
        },
        {
            "id": "q3",
            "label": "Estimated Number of Till Points / POS Stations",
            "type": "select",
            "required": true,
            "placeholder": "Select stations...",
            "options": ["1 Station", "2 Stations", "3 - 5 Stations", "6+ Stations"],
            "helpText": "Number of active terminal licenses required"
        },
        {
            "id": "q4",
            "label": "Accounts & Invoicing Contact Email",
            "type": "text",
            "required": false,
            "placeholder": "accounts@yourcompany.co.za",
            "helpText": "If different from primary contact email"
        },
        {
            "id": "q5",
            "label": "VAT Registration Number",
            "type": "text",
            "required": false,
            "placeholder": "e.g. 4010203040 (if VAT registered)",
            "helpText": "Leave blank if not registered for VAT"
        },
        {
            "id": "q6",
            "label": "Special Setup Notes or Requirements",
            "type": "textarea",
            "required": false,
            "placeholder": "Any specific hardware, printer models, or go-live deadlines...",
            "helpText": "Optional notes for our deployment team"
        }
    ]'::jsonb;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM onboarding_templates WHERE org_id = v_org_id) THEN
        INSERT INTO onboarding_templates (
            org_id,
            title,
            description,
            welcome_heading,
            welcome_subheading,
            declaration_text,
            require_signature,
            questions
        ) VALUES (
            v_org_id,
            'Standard Client Onboarding & System Setup',
            'Please fill out your official business and contact details to initiate your Lunar Sign and POS system deployment.',
            'Welcome to LunarPOS & Lunar Sign',
            'Please complete this onboarding form so our engineering and onboarding team can configure your account.',
            'I hereby certify that all information submitted herein is true, correct, and complete. I confirm that I am legally authorized to enter into service agreements and represent the company named above under South African ECTA Act 25 of 2002.',
            true,
            v_questions
        );
    END IF;
END $$;
