-- Lunar Sign Seed Data
-- Default Organisation: Computer Home Services / LunarPOS George

DO $$
DECLARE
    v_org_id UUID := '11111111-1111-1111-1111-111111111111';
    v_template_id UUID := '22222222-2222-2222-2222-222222222222';
    v_doc_id UUID := '33333333-3333-3333-3333-333333333333';
    v_recip1_id UUID := '44444444-4444-4444-4444-444444444444';
    v_recip2_id UUID := '55555555-5555-5555-5555-555555555555';
BEGIN
    -- 1. Insert Demo Organisation
    INSERT INTO organisations (
        id,
        name,
        slug,
        logo_url,
        primary_color,
        accent_color,
        text_color,
        background_color,
        email_footer_text,
        reply_to_email,
        custom_domain,
        retention_days,
        purge_voided_drafts_days
    ) VALUES (
        v_org_id,
        'LunarPOS George / Computer Home Services',
        'lunarpos-george',
        '/logo.svg',
        '#6366f1',
        '#06b6d4',
        '#0f172a',
        '#f8fafc',
        'Lunar Sign - Secure E-Signatures compliant with SA ECTA 25 of 2002. Computer Home Services t/a LunarPOS George.',
        'support@lunaposgeorge.co.za',
        'sign.lunaposgeorge.co.za',
        365,
        30
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        custom_domain = EXCLUDED.custom_domain;

    -- 2. Insert Sample Contract Template (2-Page Service Level Agreement)
    INSERT INTO templates (
        id,
        org_id,
        name,
        description,
        storage_path_pdf,
        field_definitions,
        recipient_roles,
        usage_count
    ) VALUES (
        v_template_id,
        v_org_id,
        'Standard South African Service Level Agreement (SLA)',
        'Comprehensive 2-page SLA contract template compliant with ECTA 25 of 2002 and POPIA.',
        'templates/sample_sla_contract.pdf',
        '[
            {"type": "full_name", "page": 1, "x_pct": 20.5, "y_pct": 35.0, "width_pct": 30.0, "height_pct": 3.5, "role": "client", "required": true, "label": "Client Full Name"},
            {"type": "sa_id", "page": 1, "x_pct": 55.0, "y_pct": 35.0, "width_pct": 35.0, "height_pct": 3.5, "role": "client", "required": true, "label": "SA 13-Digit ID Number"},
            {"type": "sa_vat", "page": 1, "x_pct": 20.5, "y_pct": 42.0, "width_pct": 30.0, "height_pct": 3.5, "role": "client", "required": false, "label": "Company VAT Number"},
            {"type": "currency", "page": 1, "x_pct": 55.0, "y_pct": 42.0, "width_pct": 25.0, "height_pct": 3.5, "role": "service_provider", "required": true, "label": "Monthly Fee (ZAR)"},
            {"type": "signature", "page": 2, "x_pct": 15.0, "y_pct": 75.0, "width_pct": 32.0, "height_pct": 8.0, "role": "client", "required": true, "label": "Client Signature"},
            {"type": "date_signed", "page": 2, "x_pct": 15.0, "y_pct": 85.0, "width_pct": 25.0, "height_pct": 3.5, "role": "client", "required": true, "label": "Date Signed"},
            {"type": "signature", "page": 2, "x_pct": 55.0, "y_pct": 75.0, "width_pct": 32.0, "height_pct": 8.0, "role": "service_provider", "required": true, "label": "Provider Signature"},
            {"type": "date_signed", "page": 2, "x_pct": 55.0, "y_pct": 85.0, "width_pct": 25.0, "height_pct": 3.5, "role": "service_provider", "required": true, "label": "Date Signed"}
        ]'::jsonb,
        '[
            {"role_key": "client", "role_name": "Client / Signer", "color": "#6366f1"},
            {"role_key": "service_provider", "role_name": "Service Provider", "color": "#06b6d4"}
        ]'::jsonb,
        1
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Demo Contacts
    INSERT INTO contacts (
        org_id,
        name,
        email,
        phone,
        role
    ) VALUES 
        (v_org_id, 'Johan Van Der Merwe', 'johan@example.co.za', '+27 82 123 4567', 'signer'),
        (v_org_id, 'Thabo Mokoena', 'thabo@example.co.za', '+27 83 987 6543', 'signer'),
        (v_org_id, 'Sarah Jenkins', 'sarah@example.co.za', '+27 71 555 1234', 'approver')
    ON CONFLICT (org_id, email) DO NOTHING;

END $$;
