import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserWithOrg();

    // 1. Fetch Document
    const docRes = await dbQuery(
      `SELECT d.*, o.name as org_name, o.slug as org_slug
       FROM documents d
       JOIN organisations o ON d.org_id = o.id
       WHERE d.id::text = $1
       LIMIT 1`,
      [id]
    );

    if (docRes.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docRes.rows[0];

    // 2. Fetch Recipients
    const recipsRes = await dbQuery(
      `SELECT * FROM recipients WHERE document_id = $1 ORDER BY order_index ASC`,
      [doc.id]
    );

    // 3. Fetch Fields
    const fieldsRes = await dbQuery(
      `SELECT * FROM fields WHERE document_id = $1 ORDER BY page ASC, y_pct ASC`,
      [doc.id]
    );

    // 4. Fetch Signatures
    const sigsRes = await dbQuery(
      `SELECT * FROM signatures WHERE document_id = $1`,
      [doc.id]
    );

    // 5. Fetch Audit Trail
    const auditRes = await dbQuery(
      `SELECT * FROM audit_events WHERE document_id = $1 ORDER BY created_at ASC`,
      [doc.id]
    );

    return NextResponse.json({
      document: doc,
      recipients: recipsRes.rows,
      fields: fieldsRes.rows,
      signatures: sigsRes.rows,
      auditEvents: auditRes.rows,
    });
  } catch (err: any) {
    console.error(`Error fetching document:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch document' }, { status: 500 });
  }
}
