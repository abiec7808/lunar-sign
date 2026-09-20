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
      `SELECT * FROM templates WHERE id::text = $1 AND (org_id = $2 OR $3 = true OR org_id = '11111111-1111-1111-1111-111111111111' OR $2 = '11111111-1111-1111-1111-111111111111') LIMIT 1`,
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
 * PUT /api/templates/[id] - Update an existing template (name, description, fields, roles, pdf)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      fields,
      recipientRoles,
      fileBase64,
      pdfBase64,
      originalFilename = 'template.pdf',
    } = body;

    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';

    // Verify template exists and belongs to this organization
    const existing = await dbQuery(
      `SELECT * FROM templates WHERE id::text = $1 AND (org_id = $2 OR $3 = true OR org_id = '11111111-1111-1111-1111-111111111111' OR $2 = '11111111-1111-1111-1111-111111111111') LIMIT 1`,
      [id, orgId, !!auth?.isSuperAdmin]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 404 });
    }

    const currentTpl = existing.rows[0];
    const newName = name !== undefined && name.trim() !== '' ? name.trim() : currentTpl.name;
    const newDesc = description !== undefined ? description.trim() : currentTpl.description;
    const newBase64 = fileBase64 || pdfBase64 || null;

    let updatedFieldDefs = currentTpl.field_definitions;
    if (fields !== undefined) {
      let currentDefs: any = {};
      try {
        currentDefs = typeof currentTpl.field_definitions === 'string'
          ? JSON.parse(currentTpl.field_definitions)
          : currentTpl.field_definitions || {};
      } catch (e) {}

      const cleanFields = Array.isArray(fields)
        ? fields.map((f: any) => ({
            ...f,
            value: f.type === 'text' && (f.label?.toLowerCase() === 'signature') ? '' : f.value,
          }))
        : [];

      updatedFieldDefs = JSON.stringify({
        ...currentDefs,
        fields: cleanFields,
        fileBase64: newBase64 || currentDefs.fileBase64 || currentTpl.pdf_base64 || '',
        originalFilename: originalFilename || currentDefs.originalFilename || 'template.pdf',
      });
    }

    let updatedRoles = currentTpl.recipient_roles;
    if (recipientRoles !== undefined && Array.isArray(recipientRoles)) {
      const sanitizedRoles = recipientRoles.map((r: any, i: number) => ({
        role: r.role || 'signer',
        label: r.label || `Signer ${i + 1}`,
        orderIndex: i,
        authMethod: r.authMethod || 'none',
      }));
      updatedRoles = JSON.stringify(sanitizedRoles);
    }

    const updated = await dbQuery(
      `UPDATE templates
       SET name = $1,
           description = $2,
           storage_path_pdf = COALESCE($3, storage_path_pdf),
           pdf_base64 = COALESCE($4, pdf_base64),
           field_definitions = $5,
           recipient_roles = $6,
           updated_at = NOW()
       WHERE id::text = $7
       RETURNING *`,
      [
        newName,
        newDesc,
        newBase64 ? `templates/${Date.now()}_${originalFilename}` : null,
        newBase64 || null,
        updatedFieldDefs,
        updatedRoles,
        id,
      ]
    );

    return NextResponse.json({
      success: true,
      template: updated.rows[0],
      message: `Template "${newName}" updated successfully.`,
    });
  } catch (err: any) {
    console.error('Error updating template:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update template' }, { status: 500 });
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
      `DELETE FROM templates WHERE id::text = $1 AND (org_id = $2 OR $3 = true OR org_id = '11111111-1111-1111-1111-111111111111' OR $2 = '11111111-1111-1111-1111-111111111111') RETURNING id, name`,
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

