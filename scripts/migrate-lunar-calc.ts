import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// Automatically load .env.local if present
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.iepfhsbhchycangiziul:Sharne2010!123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('🔗 Connecting to Supabase database for Lunar Calc migration...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260920000005_lunar_calc.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('⚡ Executing 20260920000005_lunar_calc.sql...');
    await client.query(sql);
    console.log('🎉 Successfully applied Lunar Calc migration!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
