import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { resendOnboardingInvite } from '@/lib/onboarding/service';

const ResendSchema = z.object({
  overrideEmail: z.string().email().optional().or(z.literal('')),
  customMessage: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let overrideEmail: string | undefined;
    let customMessage: string | undefined;

    try {
      const body = await req.json();
      const parsed = ResendSchema.parse(body);
      overrideEmail = parsed.overrideEmail ? parsed.overrideEmail.trim().toLowerCase() : undefined;
      customMessage = parsed.customMessage ? parsed.customMessage.trim() : undefined;
    } catch {
      // Body is optional
    }

    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const result = await resendOnboardingInvite(
      id,
      session,
      overrideEmail,
      customMessage,
      baseUrl
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/onboarding/submissions/[id]/resend:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to resend onboarding invitation' },
      { status: 400 }
    );
  }
}
