import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import {
  verifyOnboardingAccess,
  getOnboardingSubmissions,
  createOnboardingInvite,
} from '@/lib/onboarding/service';

const CreateInviteSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  contactNumber: z.string().optional(),
  companyName: z.string().optional(),
  customMessage: z.string().optional(),
  sendEmail: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyOnboardingAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Access denied', requested: access.requested },
        { status: 403 }
      );
    }

    const submissions = await getOnboardingSubmissions(access.effectiveOrgId);
    return NextResponse.json({ submissions });
  } catch (err: any) {
    console.error('Error fetching onboarding submissions:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch submissions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyOnboardingAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Access denied', requested: access.requested },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = CreateInviteSchema.parse(body);

    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const { submission, inviteUrl, emailSent } = await createOnboardingInvite(access.effectiveOrgId, {
      ...validated,
      email: validated.email ? validated.email : undefined,
      baseUrl,
    });

    return NextResponse.json({ success: true, submission, inviteUrl, emailSent });
  } catch (err: any) {
    console.error('Error generating onboarding invite:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate invite' }, { status: 500 });
  }
}
