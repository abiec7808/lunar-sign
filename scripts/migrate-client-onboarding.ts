import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.iepfhsbhchycangiziul:Sharne2010!123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('🔗 Connecting to Supabase database for Client Onboarding migration...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database.');

    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260920000006_client_onboarding.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('⚡ Executing 20260920000006_client_onboarding.sql...');
    await client.query(sql);
    console.log('🎉 Successfully applied Client Onboarding migration!');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
