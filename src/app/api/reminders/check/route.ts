import { NextRequest, NextResponse } from 'next/server';
import { processExpiringDocumentReminders } from '@/lib/email/reminders';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reminders/check - Process expiring documents and send 1-day reminders
 */
export async function GET(req: NextRequest) {
  try {
    const result = await processExpiringDocumentReminders();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error('Failed to process reminders:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while processing reminders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminders/check - Also allow POST for Webhooks / Cron / Automations
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
