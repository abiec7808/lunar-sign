import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';

/**
 * GET /api/templates - List all saved templates for the authenticated tenant
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';

    const res = await dbQuery(
      `SELECT id, name, description, storage_path_pdf, field_definitions, recipient_roles, usage_count, created_at, updated_at
       FROM templates
       WHERE org_id = $1
       ORDER BY created_at DESC`,
      [orgId]
    );

    return NextResponse.json({ templates: res.rows });
  } catch (err: any) {
    console.error('Error fetching templates:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list templates' }, { status: 500 });
  }
}

/**
 * POST /api/templates - Save a new reusable template
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description = '', fields = [], recipientRoles = [], fileBase64 = '', originalFilename = 'template.pdf' } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';
    const userId = auth?.userId || '22222222-2222-2222-2222-222222222222';

    const payloadFields = {
      fields,
      fileBase64,
      originalFilename,
    };

    const res = await dbQuery(
      `INSERT INTO templates (org_id, created_by, name, description, storage_path_pdf, field_definitions, recipient_roles)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orgId,
        userId,
        name.trim(),
        description.trim() || `Custom template for ${name.trim()}`,
        `templates/${Date.now()}_${originalFilename}`,
        JSON.stringify(payloadFields),
        JSON.stringify(recipientRoles),
      ]
    );

    return NextResponse.json({
      success: true,
      template: res.rows[0],
      message: `Template "${name}" saved successfully.`,
    });
  } catch (err: any) {
    console.error('Error creating template:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save template' }, { status: 500 });
  }
}
