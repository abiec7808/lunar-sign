import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.iepfhsbhchycangiziul:Sharne2010!123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function run() {
  console.log('🔗 Connecting to Supabase Postgres database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully to Supabase Postgres!');

    const migrationFiles = [
      'supabase/migrations/20260920000001_initial_schema.sql',
      'supabase/migrations/20260920000002_rls_policies.sql',
      'supabase/seed.sql',
    ];

    for (const relPath of migrationFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      console.log(`📄 Executing migration: ${relPath}...`);
      const sql = fs.readFileSync(fullPath, 'utf-8');
      await client.query(sql);
      console.log(`✅ Completed: ${relPath}`);
    }

    console.log('🎉 All SQL migrations and seed data have been applied to Supabase database!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
