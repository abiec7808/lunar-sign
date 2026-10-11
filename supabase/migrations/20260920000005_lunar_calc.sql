-- Migration: 20260920000005_lunar_calc.sql
-- Lunar Calc: Software cost & selling price calculator with profit aggregates and client license allocation

-- 1. Enable Lunar Calc flag on organisations table
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS lunar_calc_enabled BOOLEAN DEFAULT false;

-- Super Admin organisation (LunarPOS George) has Lunar Calc enabled by default
UPDATE organisations
SET lunar_calc_enabled = true
WHERE id = '11111111-1111-1111-1111-111111111111' OR slug = 'lunarpos-george';

-- 2. Products Catalog Table (Cost to vendor/EasyAs vs Selling to client)
CREATE TABLE IF NOT EXISTS calc_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'monthly', 'annually', 'once_off'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_calc_products_org ON calc_products(org_id);

-- 3. Calculator Clients Table
CREATE TABLE IF NOT EXISTS calc_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'pending', 'inactive'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_calc_clients_org ON calc_clients(org_id);

-- 4. Client License Allocation Items Table
CREATE TABLE IF NOT EXISTS calc_client_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES calc_clients(id) ON DELETE CASCADE,
    product_id UUID REFERENCES calc_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    custom_cost_price NUMERIC(12, 2),
    custom_selling_price NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_calc_client_items_client ON calc_client_items(client_id);
CREATE INDEX IF NOT EXISTS idx_calc_client_items_product ON calc_client_items(product_id);

-- 5. Seed default EasyAs software products for LunarPOS George
DO $$
DECLARE
    v_org_id UUID := '11111111-1111-1111-1111-111111111111';
    v_p1 UUID;
    v_p2 UUID;
    v_p3 UUID;
    v_c1 UUID;
    v_c2 UUID;
BEGIN
    -- Check if products already exist for this org
    IF NOT EXISTS (SELECT 1 FROM calc_products WHERE org_id = v_org_id) THEN
        INSERT INTO calc_products (id, org_id, name, code, description, cost_price, selling_price, billing_cycle)
        VALUES 
            (gen_random_uuid(), v_org_id, 'EasyAs POS Base License', 'EA-POS-BASE', 'Primary point of sale license per till point', 250.00, 550.00, 'monthly')
        RETURNING id INTO v_p1;

        INSERT INTO calc_products (id, org_id, name, code, description, cost_price, selling_price, billing_cycle)
        VALUES 
            (gen_random_uuid(), v_org_id, 'EasyAs Additional Till Terminal', 'EA-POS-TERM', 'Additional till lane license', 120.00, 300.00, 'monthly')
        RETURNING id INTO v_p2;

        INSERT INTO calc_products (id, org_id, name, code, description, cost_price, selling_price, billing_cycle)
        VALUES 
            (gen_random_uuid(), v_org_id, 'EasyAs Backoffice & Accounting Sync', 'EA-SYNC-BO', 'Cloud stock control, audit trail & accounting export module', 180.00, 450.00, 'monthly')
        RETURNING id INTO v_p3;

        INSERT INTO calc_products (org_id, name, code, description, cost_price, selling_price, billing_cycle)
        VALUES 
            (v_org_id, 'EasyAs Handheld Waiter / Scanner License', 'EA-MOBILE', 'Android handheld table-side ordering terminal', 100.00, 250.00, 'monthly'),
            (v_org_id, 'EasyAs Cloud Remote Analytics', 'EA-CLOUD-DASH', 'Live mobile dashboard & business metrics', 90.00, 220.00, 'monthly');

        -- Seed sample clients
        INSERT INTO calc_clients (id, org_id, name, contact_person, email, phone, notes)
        VALUES 
            (gen_random_uuid(), v_org_id, 'Outeniqua Farm Bistro', 'Johan van der Merwe', 'bistro@outeniqua.co.za', '+27 44 874 5500', '2 till lanes + backoffice sync')
        RETURNING id INTO v_c1;

        INSERT INTO calc_clients (id, org_id, name, contact_person, email, phone, notes)
        VALUES 
            (gen_random_uuid(), v_org_id, 'Wilderness Surf Cafe', 'Sarah Jenkins', 'orders@wildernesssurf.co.za', '+27 82 345 6789', 'Main till + 1 mobile waiter')
        RETURNING id INTO v_c2;

        -- Assign licenses to sample clients
        INSERT INTO calc_client_items (client_id, product_id, quantity)
        VALUES 
            (v_c1, v_p1, 1),
            (v_c1, v_p2, 1),
            (v_c1, v_p3, 1),
            (v_c2, v_p1, 1);
    END IF;
END $$;
