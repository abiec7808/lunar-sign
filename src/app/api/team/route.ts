import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/passwords';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';

    const orgRes = await dbQuery('SELECT max_users FROM organisations WHERE id = $1', [orgId]);
    const maxUsers = orgRes.rows[0]?.max_users || 5;

    const membersRes = await dbQuery(
      `SELECT id, full_name, email, role, phone, is_active, totp_enabled, created_at
       FROM profiles
       WHERE org_id = $1
       ORDER BY created_at ASC`,
      [orgId]
    );

    return NextResponse.json({
      members: membersRes.rows,
      maxUsers,
      currentCount: membersRes.rows.length,
    });
  } catch (err: any) {
    console.error('Error fetching team members:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch team members' }, { status: 500 });
  }
}

const InviteMemberSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  phone: z.string().optional(),
  tempPassword: z.string().min(6).default('LunarPass2026!'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserWithOrg();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = InviteMemberSchema.parse(body);

    const orgRes = await dbQuery('SELECT max_users FROM organisations WHERE id = $1', [auth.orgId]);
    const maxUsers = orgRes.rows[0]?.max_users || 5;

    const countRes = await dbQuery('SELECT COUNT(*) as count FROM profiles WHERE org_id = $1', [auth.orgId]);
    const currentCount = parseInt(countRes.rows[0].count, 10) || 0;

    if (currentCount >= maxUsers && !auth.isSuperAdmin) {
      return NextResponse.json(
        {
          error: `User limit reached (${currentCount}/${maxUsers}). Your business tier allows up to ${maxUsers} user accounts. Contact admin@lunarposgeorge.co.za to request an increase.`,
        },
        { status: 403 }
      );
    }

    // Check if email already registered
    const existing = await dbQuery('SELECT id FROM profiles WHERE LOWER(email) = $1', [validated.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A user with this email address already exists.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(validated.tempPassword);

    const inserted = await dbQuery(
      `INSERT INTO profiles (org_id, full_name, email, role, phone, is_active, password_hash)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, full_name, email, role, phone, is_active, created_at`,
      [
        auth.orgId,
        validated.fullName,
        validated.email.toLowerCase(),
        validated.role,
        validated.phone || null,
        passwordHash,
      ]
    );

    return NextResponse.json({
      success: true,
      member: inserted.rows[0],
      message: 'Team member successfully invited and added!',
    });
  } catch (err: any) {
    console.error('Error inviting team member:', err);
    return NextResponse.json({ error: err?.message || 'Failed to invite team member' }, { status: 500 });
  }
}
