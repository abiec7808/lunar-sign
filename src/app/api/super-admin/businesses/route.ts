import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserWithOrg();
    if (!auth?.isSuperAdmin && auth?.email !== 'admin@lunarposgeorge.co.za') {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
    }

    const res = await dbQuery(
      `SELECT o.*,
              COUNT(DISTINCT p.id) AS total_users,
              COUNT(DISTINCT d.id) AS total_documents,
              admin_p.full_name AS admin_name,
              admin_p.email AS admin_email
       FROM organisations o
       LEFT JOIN profiles p ON o.id = p.org_id
       LEFT JOIN documents d ON o.id = d.org_id
       LEFT JOIN LATERAL (
         SELECT full_name, email FROM profiles WHERE org_id = o.id ORDER BY created_at ASC LIMIT 1
       ) admin_p ON true
       GROUP BY o.id, admin_p.full_name, admin_p.email
       ORDER BY o.created_at DESC`
    );

    return NextResponse.json({
      businesses: res.rows,
    });
  } catch (err: any) {
    console.error('Error in super-admin businesses GET:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch businesses' }, { status: 500 });
  }
}
