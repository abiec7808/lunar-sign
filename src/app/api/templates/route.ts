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
    const cleanName = name.trim();

    // Sanitize recipient roles to be generic (no hardcoded person names)
    const sanitizedRoles = Array.isArray(recipientRoles) && recipientRoles.length > 0
      ? recipientRoles.map((r: any, i: number) => ({
          role: r.role || 'signer',
          label: `Signer ${i + 1}`,
          orderIndex: i,
          authMethod: r.authMethod || 'none',
        }))
      : [{ role: 'signer', label: 'Signer 1', orderIndex: 0 }];

    const payloadFields = {
      fields: Array.isArray(fields) ? fields.map((f: any) => ({ ...f, value: f.type === 'text' && (f.label?.toLowerCase() === 'signature') ? '' : f.value })) : [],
      fileBase64,
      originalFilename,
    };

    // Check if template with same name already exists in this organisation
    const existing = await dbQuery(
      `SELECT id FROM templates WHERE org_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [orgId, cleanName]
    );

    let tplResult;
    if (existing.rows.length > 0) {
      // Update existing template to avoid duplicate cards
      const updated = await dbQuery(
        `UPDATE templates
         SET description = $1,
             storage_path_pdf = COALESCE($2, storage_path_pdf),
             field_definitions = $3,
             recipient_roles = $4,
             updated_at = NOW()
         WHERE id = $5 AND org_id = $6
         RETURNING *`,
        [
          description.trim() || `Custom template for ${cleanName}`,
          fileBase64 ? `templates/${Date.now()}_${originalFilename}` : null,
          JSON.stringify(payloadFields),
          JSON.stringify(sanitizedRoles),
          existing.rows[0].id,
          orgId,
        ]
      );
      tplResult = updated.rows[0];
    } else {
      // Insert new template
      const inserted = await dbQuery(
        `INSERT INTO templates (org_id, created_by, name, description, storage_path_pdf, field_definitions, recipient_roles)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          orgId,
          userId,
          cleanName,
          description.trim() || `Custom template for ${cleanName}`,
          `templates/${Date.now()}_${originalFilename}`,
          JSON.stringify(payloadFields),
          JSON.stringify(sanitizedRoles),
        ]
      );
      tplResult = inserted.rows[0];
    }

    return NextResponse.json({
      success: true,
      template: tplResult,
      message: `Template "${cleanName}" saved successfully.`,
    });
  } catch (err: any) {
    console.error('Error creating template:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save template' }, { status: 500 });
  }
}
