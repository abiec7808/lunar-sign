import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';

/**
 * GET /api/templates/[id] - Fetch template details
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';

    const res = await dbQuery(
      `SELECT * FROM templates WHERE id::text = $1 AND (org_id = $2 OR $3 = true) LIMIT 1`,
      [id, orgId, !!auth?.isSuperAdmin]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const tpl = res.rows[0];

    // Increment usage count
    await dbQuery(`UPDATE templates SET usage_count = usage_count + 1 WHERE id::text = $1`, [id]);

    return NextResponse.json({ template: tpl });
  } catch (err: any) {
    console.error('Error fetching template:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch template' }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/[id] - Delete a template
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';

    const res = await dbQuery(
      `DELETE FROM templates WHERE id::text = $1 AND (org_id = $2 OR $3 = true) RETURNING id, name`,
      [id, orgId, !!auth?.isSuperAdmin]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Template "${res.rows[0].name}" deleted successfully.`,
    });
  } catch (err: any) {
    console.error('Error deleting template:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete template' }, { status: 500 });
  }
}
