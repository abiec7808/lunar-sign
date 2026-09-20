-- Migration: 20260920000003_business_accounts.sql
-- Enables multi-tenant business registration, details persistence, and direct secure authentication

-- 1. Ensure columns on organisations table
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS company_reg_number VARCHAR(50);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Ensure columns on profiles table for direct multi-tenant auth
-- Note: id column can be standalone UUID or auth.users UUID
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Make sure profiles id does not strictly require auth.users if self-hosted without Supabase Auth triggers
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Seed default LunarPOS George Admin if not exists
INSERT INTO organisations (id, name, slug, email_footer_text, reply_to_email, vat_number, phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'LunarPOS George / Computer Home Services',
  'lunarpos-george',
  'Lunar Sign - Powered by Computer Home Services / LunarPOS George. Valid under SA ECTA 25 of 2002.',
  'admin@lunarposgeorge.co.za',
  '4010203040',
  '+27 44 874 1234'
)
ON CONFLICT (id) DO UPDATE SET
  vat_number = EXCLUDED.vat_number,
  phone = EXCLUDED.phone;

-- Insert / Update Admin profile with cryptographically hashed password for 'Sharne2010!123'
-- pgcrypto crypt('Sharne2010!123', gen_salt('bf', 10))
INSERT INTO profiles (id, org_id, full_name, email, role, is_active, password_hash)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Lunar Administrator',
  'admin@lunarposgeorge.co.za',
  'owner',
  true,
  crypt('Sharne2010!123', gen_salt('bf', 10))
)
ON CONFLICT (id) DO UPDATE SET
  password_hash = crypt('Sharne2010!123', gen_salt('bf', 10)),
  role = 'owner',
  is_active = true;
