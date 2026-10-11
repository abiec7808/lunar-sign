import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health - Fast, lightweight container & uptime health check
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  try {
    await dbQuery('SELECT 1');
    const latency = Date.now() - start;
    return NextResponse.json({
      status: 'ok',
      service: 'lunar-sign',
      database: 'connected',
      latencyMs: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        service: 'lunar-sign',
        database: 'disconnected',
        error: err?.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
