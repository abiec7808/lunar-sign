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

function getPoolInstance(): Pool {
  if (!global.__dbPool) {
    global.__dbPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    global.__dbPool.on('error', (err) => {
      console.error('[DB Pool Idle Error]', err);
    });
  }
  return global.__dbPool;
}

export const pool = getPoolInstance();

export async function dbQuery<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getPoolInstance();
  const start = Date.now();
  try {
    const res = await p.query<T>(text, params);
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
  const p = getPoolInstance();
  const client = await p.connect();
  return client;
}
