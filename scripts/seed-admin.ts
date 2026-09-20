/**
 * Lunar Sign - Admin Bootstrapping Seed Script
 * Run with: npx tsx scripts/seed-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load env files without external dependency
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = (match[2] || '').replace(/^['"](.*)['"]$/, '$1');
        }
      });
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@lunaposgeorge.co.za';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'LunarSign#2026!SecureKey';
const adminName = process.env.SEED_ADMIN_NAME || 'Lunar Administrator';

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
  console.log('⚠️ Supabase credentials not yet configured in .env.local. Admin script ready for when credentials are provided.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function bootstrap() {
  console.log('🚀 Bootstrapping initial organisation and administrator...');

  // 1. Ensure default organisation exists
  const orgId = '11111111-1111-1111-1111-111111111111';
  const { error: orgErr } = await supabase.from('organisations').upsert({
    id: orgId,
    name: 'LunarPOS George / Computer Home Services',
    slug: 'lunarpos-george',
    primary_color: '#6366f1',
    accent_color: '#06b6d4',
    text_color: '#0f172a',
    background_color: '#f8fafc',
    email_footer_text: 'Lunar Sign - Secure E-Signatures compliant with SA ECTA 25 of 2002. Computer Home Services t/a LunarPOS George.',
    reply_to_email: 'support@lunaposgeorge.co.za',
    custom_domain: 'sign.lunaposgeorge.co.za',
    retention_days: 365,
    purge_voided_drafts_days: 30,
  });

  if (orgErr) {
    console.error('Error inserting organisation:', orgErr.message);
  } else {
    console.log('✅ Organisation ready.');
  }

  // 2. Create Auth User in Supabase Auth
  const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: adminName },
  });

  let userId: string;
  if (userErr) {
    if (userErr.message.includes('already registered')) {
      console.log('ℹ️ Admin user already exists in auth. Fetching user profile...');
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existing = listData.users.find((u) => u.email === adminEmail);
      if (!existing) throw new Error('Could not find existing admin user ID');
      userId = existing.id;
    } else {
      console.error('Error creating admin auth user:', userErr.message);
      return;
    }
  } else {
    userId = userData.user.id;
    console.log('✅ Admin auth user created successfully.');
  }

  // 3. Upsert Profile with Owner role and requiring TOTP/password change
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    org_id: orgId,
    full_name: adminName,
    email: adminEmail,
    role: 'owner',
    is_active: true,
    require_password_change: true,
    totp_enabled: false,
  });

  if (profErr) {
    console.error('Error creating profile record:', profErr.message);
  } else {
    console.log(`🎉 Bootstrap complete! Admin Email: ${adminEmail}`);
    console.log(`👉 First-time login will prompt for password update and TOTP 2FA setup.`);
  }
}

bootstrap().catch(console.error);
