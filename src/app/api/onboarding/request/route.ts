import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { dbQuery } from '@/lib/db';
import { requestOnboardingModule } from '@/lib/onboarding/service';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load org details
    const orgRes = await dbQuery(
      `SELECT o.name, p.full_name, p.email, p.phone
       FROM profiles p
       JOIN organisations o ON p.org_id = o.id
       WHERE p.id = $1 LIMIT 1`,
      [session.userId]
    );

    const info = orgRes.rows[0] || {
      name: session.orgSlug,
      full_name: session.fullName,
      email: session.email,
      phone: null,
    };

    const result = await requestOnboardingModule(session.orgId, {
      fullName: info.full_name,
      email: info.email,
      phone: info.phone,
      orgName: info.name,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error requesting onboarding module:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit module request' },
      { status: 500 }
    );
  }
}
