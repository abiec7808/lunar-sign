-- Migration: 20260920000004_super_admin_and_limits.sql
-- Adds business approval workflow, super admin flags, and per-business tenant limits (5 users, 10 documents)

-- 1. Add status and limit columns to organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending_approval';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS max_documents INTEGER DEFAULT 10;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS approved_by UUID;

-- 2. Add is_super_admin column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 3. Set LunarPOS George / Computer Home Services organisation as approved with unlimited/high limits
UPDATE organisations
SET status = 'approved',
    max_users = 100,
    max_documents = 1000,
    approved_at = NOW()
WHERE id = '11111111-1111-1111-1111-111111111111' OR slug = 'lunarpos-george';

-- 4. Mark admin@lunarposgeorge.co.za as super_admin
UPDATE profiles
SET is_super_admin = true,
    role = 'owner'
WHERE email = 'admin@lunarposgeorge.co.za';

-- 5. Approve existing Apex test organisation if exists
UPDATE organisations
SET status = 'approved',
    approved_at = NOW()
WHERE slug LIKE '%apex%';
