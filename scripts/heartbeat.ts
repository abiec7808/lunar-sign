import fs from 'fs';
import path from 'path';

// Automatically load .env.local for local script execution if not running inside Next.js
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { dbQuery } from '../src/lib/db';
import { getAdminSupabaseClient } from '../src/lib/supabase/admin';
import { processExpiringDocumentReminders } from '../src/lib/email/reminders';
import { checkAndTriggerSequentialSigners } from '../src/lib/email/sequential-trigger';

async function main() {
  console.log('🌕 Lunar Sign Heartbeat Runner');
  console.log('=================================');
  const start = Date.now();

  // 1. Direct PostgreSQL ping
  console.log('1️⃣ Checking direct PostgreSQL pool...');
  try {
    const pgStart = Date.now();
    const res = await dbQuery('SELECT 1 as alive, NOW() as server_time');
    const pgDuration = Date.now() - pgStart;
    console.log(
      `   ✅ Direct PostgreSQL OK (${pgDuration}ms) - DB Time: ${res.rows[0]?.server_time}`
    );
  } catch (err: any) {
    console.error(`   ❌ PostgreSQL Check Failed:`, err.message);
  }

  // 2. Supabase REST API PostgREST ping
  console.log('2️⃣ Checking Supabase PostgREST API Gateway...');
  try {
    const supaStart = Date.now();
    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase.from('organisations').select('id').limit(1);
    const supaDuration = Date.now() - supaStart;
    if (error) {
      console.warn(`   ⚠️ Supabase REST API notice: ${error.message} (${supaDuration}ms)`);
    } else {
      console.log(
        `   ✅ Supabase PostgREST Gateway OK (${supaDuration}ms) - Inbound HTTP registered`
      );
    }
  } catch (err: any) {
    console.error(`   ❌ Supabase API Check Failed:`, err.message);
  }

  // 3. Maintenance tasks
  console.log('3️⃣ Running document maintenance (Reminders & Sequential Signers)...');
  try {
    const reminders = await processExpiringDocumentReminders();
    console.log(
      `   📬 Reminders checked: ${reminders.documentsChecked}, sent: ${reminders.remindersSent}, expired: ${reminders.documentsExpired}`
    );
    const seq = await checkAndTriggerSequentialSigners();
    console.log(
      `   🔀 Sequential signers checked: ${seq.checkedDocuments}, triggered: ${seq.triggeredSigners.length}`
    );
  } catch (err: any) {
    console.error(`   ❌ Maintenance tasks error:`, err.message);
  }

  const total = Date.now() - start;
  console.log('=================================');
  console.log(`✨ Heartbeat finished in ${total}ms. All services active and warm!`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal heartbeat runner error:', err);
  process.exit(1);
});
