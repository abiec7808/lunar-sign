import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { dbQuery } from '@/lib/db';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Refresh org details from database
    const orgRes = await dbQuery(
      `SELECT o.*, p.full_name, p.role, p.email
       FROM profiles p
       JOIN organisations o ON p.org_id = o.id
       WHERE p.id = $1
       LIMIT 1`,
      [session.userId]
    );

    if (orgRes.rows.length === 0) {
      return NextResponse.json({ user: session });
    }

    const data = orgRes.rows[0];
    return NextResponse.json({
      user: {
        userId: session.userId,
        orgId: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role,
        orgName: data.name,
        orgSlug: data.slug,
        vatNumber: data.vat_number,
        companyRegNumber: data.company_reg_number,
        phone: data.phone,
        address: data.address,
        logoUrl: data.logo_url,
        primaryColor: data.primary_color,
        accentColor: data.accent_color,
        createdAt: session.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json({ user: null });
  }
}
