import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';

const UpdateBusinessStatusSchema = z.object({
  status: z.enum(['approved', 'pending_approval', 'suspended']),
  maxUsers: z.number().optional(),
  maxDocuments: z.number().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserWithOrg();
    if (!auth?.isSuperAdmin && auth?.email !== 'admin@lunarposgeorge.co.za') {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const validated = UpdateBusinessStatusSchema.parse(body);

    const updates: string[] = ['status = $1', 'updated_at = NOW()'];
    const values: any[] = [validated.status, id];
    let paramIdx = 3;

    if (validated.status === 'approved') {
      updates.push(`approved_at = NOW()`);
      updates.push(`approved_by = $${paramIdx++}`);
      values.push(auth.userId);
    }

    if (validated.maxUsers !== undefined) {
      updates.push(`max_users = $${paramIdx++}`);
      values.push(validated.maxUsers);
    }

    if (validated.maxDocuments !== undefined) {
      updates.push(`max_documents = $${paramIdx++}`);
      values.push(validated.maxDocuments);
    }

    const query = `
      UPDATE organisations
      SET ${updates.join(', ')}
      WHERE id::text = $2
      RETURNING *
    `;

    const res = await dbQuery(query, values);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    const org = res.rows[0];

    // Log super admin audit action
    await dbQuery(
      `INSERT INTO audit_events (actor_type, event_type, description, metadata)
       VALUES ('admin', 'super_admin.org_status_updated', $1, $2)`,
      [
        `Super Admin approved/updated business "${org.name}" status to "${org.status}".`,
        JSON.stringify({
          orgId: org.id,
          status: org.status,
          maxUsers: org.max_users,
          maxDocuments: org.max_documents,
          updatedBy: auth.email,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      business: org,
    });
  } catch (err: any) {
    console.error('Error updating business status:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update business status' }, { status: 500 });
  }
}
