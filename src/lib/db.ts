import { Pool, QueryResult, QueryResultRow } from 'pg';

/**
 * Direct Live Supabase PostgreSQL Connection Pool
 * Handles pooled connections for both local dev and serverless Netlify / Vercel execution.
 */
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.iepfhsbhchycangiziul:Sharne2010!123@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const pool =
  global.__dbPool ||
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

export async function dbQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB Query] ${text.substring(0, 60)}... (${duration}ms, ${res.rowCount} rows)`);
    }
    return res;
  } catch (err) {
    console.error(`[DB Query Error] SQL: ${text}`, err);
    throw err;
  }
}

export async function getDbClient() {
  const client = await pool.connect();
  return client;
}

export { pool };
