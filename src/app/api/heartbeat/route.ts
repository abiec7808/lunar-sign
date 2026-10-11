import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { processExpiringDocumentReminders } from '@/lib/email/reminders';
import { checkAndTriggerSequentialSigners } from '@/lib/email/sequential-trigger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Validates request authorization.
 * If neither HEARTBEAT_SECRET nor CRON_SECRET is configured in environment,
 * heartbeat is permitted to allow public uptime checks (e.g., UptimeRobot, cron-job.org).
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.HEARTBEAT_SECRET || process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === secret) return true;
  }

  const customHeader =
    req.headers.get('x-heartbeat-secret') || req.headers.get('x-cron-secret');
  if (customHeader && customHeader.trim() === secret) {
    return true;
  }

  const queryToken =
    req.nextUrl.searchParams.get('token') ||
    req.nextUrl.searchParams.get('secret');
  if (queryToken && queryToken.trim() === secret) {
    return true;
  }

  return false;
}

/**
 * Executes heartbeat tests:
 * 1. Direct PostgreSQL connection & query
 * 2. Supabase REST API PostgREST query (prevents Supabase project pausing)
 * 3. Expiring document reminders & sequential signer progression
 */
async function runHeartbeat(req: NextRequest) {
  const startTime = Date.now();
  const pingOnly = req.nextUrl.searchParams.get('ping_only') === 'true';

  let postgresOk = false;
  let postgresLatency = 0;
  let postgresError: string | null = null;
  let serverTime: string | null = null;

  let supabaseApiOk = false;
  let supabaseApiLatency = 0;
  let supabaseApiError: string | null = null;

  // 1. Direct PostgreSQL Pool Check
  try {
    const pgStart = Date.now();
    const pgRes = await dbQuery('SELECT 1 as alive, NOW() as server_time');
    postgresLatency = Date.now() - pgStart;
    postgresOk = true;
    serverTime = pgRes.rows[0]?.server_time?.toISOString?.() || new Date().toISOString();
  } catch (err: any) {
    postgresError = err?.message || 'Failed to query PostgreSQL directly';
  }

  // 2. Supabase PostgREST API Check
  // Note: Supabase's pause monitor specifically tracks incoming REST/Auth HTTP gateway traffic
  try {
    const supaStart = Date.now();
    const supabase = getAdminSupabaseClient();
    const { error } = await supabase.from('organisations').select('id').limit(1);
    supabaseApiLatency = Date.now() - supaStart;
    if (error) {
      supabaseApiError = error.message;
    } else {
      supabaseApiOk = true;
    }
  } catch (err: any) {
    supabaseApiError = err?.message || 'Failed to query Supabase REST API';
  }

  // 3. Document Lifecycle Maintenance (Reminders & Sequential Signers)
  let remindersResult = null;
  let sequentialResult = null;
  let maintenanceError: string | null = null;

  if (!pingOnly) {
    try {
      remindersResult = await processExpiringDocumentReminders();
      sequentialResult = await checkAndTriggerSequentialSigners();
    } catch (err: any) {
      console.error('[Heartbeat Maintenance Error]', err);
      maintenanceError = err?.message || 'Failed during background maintenance tasks';
    }
  }

  const totalDuration = Date.now() - startTime;
  const isHealthy = postgresOk;

  const responseBody = {
    status: isHealthy ? 'healthy' : 'degraded',
    project: 'Lunar Sign',
    timestamp: new Date().toISOString(),
    totalDurationMs: totalDuration,
    checks: {
      postgres: {
        status: postgresOk ? 'connected' : 'error',
        latencyMs: postgresLatency,
        serverTime,
        error: postgresError,
      },
      supabaseApi: {
        status: supabaseApiOk ? 'connected' : 'error',
        latencyMs: supabaseApiLatency,
        error: supabaseApiError,
      },
    },
    maintenance: pingOnly
      ? { skipped: true }
      : {
          remindersResult,
          sequentialResult,
          error: maintenanceError,
        },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-Heartbeat-Status': isHealthy ? 'healthy' : 'degraded',
    },
  });
}

/**
 * GET /api/heartbeat - Scheduled keep-alive & health check
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runHeartbeat(req);
}

/**
 * POST /api/heartbeat - Webhook / trigger compatibility
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runHeartbeat(req);
}

/**
 * HEAD /api/heartbeat - Ultra-lightweight uptime pings
 */
export async function HEAD(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new Response(null, { status: 401 });
  }
  return new Response(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache',
      'X-Heartbeat-Status': 'healthy',
    },
  });
}
