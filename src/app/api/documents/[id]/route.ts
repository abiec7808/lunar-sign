import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';
import { emailService } from '@/lib/email/service';

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

/**
 * DELETE /api/documents/[id] - Permanently delete or void and remove a document envelope
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';
    const isSuperAdmin = !!auth?.isSuperAdmin;

    // Check if document exists and belongs to this organization
    const checkRes = await dbQuery(
      `SELECT id, title, org_id FROM documents WHERE id::text = $1 AND (org_id = $2 OR $3 = true) LIMIT 1`,
      [id, orgId, isSuperAdmin]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    // Delete document (cascade removes recipients, fields, signatures, and audit_events)
    await dbQuery(`DELETE FROM documents WHERE id::text = $1`, [id]);

    return NextResponse.json({
      success: true,
      message: `Document "${checkRes.rows[0].title}" was successfully deleted and removed.`,
    });
  } catch (err: any) {
    console.error(`Error deleting document:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to delete document' }, { status: 500 });
  }
}

/**
 * PATCH /api/documents/[id] - Void document or update status with signer notifications
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action = 'void', reason = 'Voided by administrator', remove = false } = body;

    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';
    const isSuperAdmin = !!auth?.isSuperAdmin;
    const senderName = auth?.fullName || 'Administrator';

    const checkRes = await dbQuery(
      `SELECT id, title, org_id, status FROM documents WHERE id::text = $1 AND (org_id = $2 OR $3 = true) LIMIT 1`,
      [id, orgId, isSuperAdmin]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    const doc = checkRes.rows[0];

    // Handle Archive / Unarchive actions
    if (action === 'archive') {
      await dbQuery(
        `UPDATE documents SET is_archived = true, archived_at = NOW(), updated_at = NOW() WHERE id::text = $1`,
        [id]
      );
      await dbQuery(
        `INSERT INTO audit_events (document_id, actor_type, event_type, description)
         VALUES ($1, 'admin', 'document.archived', $2)`,
        [doc.id, `Document moved to historical archives by ${senderName}.`]
      );
      return NextResponse.json({
        success: true,
        message: `Document "${doc.title}" was archived for history and safekeeping.`,
      });
    }

    if (action === 'unarchive') {
      await dbQuery(
        `UPDATE documents SET is_archived = false, archived_at = NULL, updated_at = NOW() WHERE id::text = $1`,
        [id]
      );
      await dbQuery(
        `INSERT INTO audit_events (document_id, actor_type, event_type, description)
         VALUES ($1, 'admin', 'document.unarchived', $2)`,
        [doc.id, `Document restored from archives by ${senderName}.`]
      );
      return NextResponse.json({
        success: true,
        message: `Document "${doc.title}" restored from archives.`,
      });
    }

    // Fetch recipients to notify if voiding
    const recipsRes = await dbQuery(
      `SELECT email, name FROM recipients WHERE document_id = $1 AND status != 'signed'`,
      [doc.id]
    );

    // If remove is requested upon voiding, delete the record completely
    if (remove) {
      // Notify signers first before cascade deleting
      for (const r of recipsRes.rows) {
        try {
          await emailService.sendVoided({
            to: r.email,
            recipientName: r.name,
            senderName,
            documentTitle: doc.title,
            voidReason: reason,
            documentId: doc.id,
          });
        } catch (err) {
          console.warn(`Failed to send void email to ${r.email}:`, err);
        }
      }

      await dbQuery(`DELETE FROM documents WHERE id::text = $1`, [id]);

      return NextResponse.json({
        success: true,
        message: `Document "${doc.title}" was voided and completely removed.`,
      });
    }

    // Otherwise mark status as 'voided' and record audit log
    await dbQuery(
      `UPDATE documents SET status = 'voided', voided_reason = $1, updated_at = NOW() WHERE id::text = $2`,
      [reason, id]
    );

    await dbQuery(
      `INSERT INTO audit_events (document_id, actor_type, event_type, description)
       VALUES ($1, 'admin', 'document.voided', $2)`,
      [doc.id, `Document voided by ${senderName}. Reason: ${reason}`]
    );

    // Notify signers
    for (const r of recipsRes.rows) {
      try {
        await emailService.sendVoided({
          to: r.email,
          recipientName: r.name,
          senderName,
          documentTitle: doc.title,
          voidReason: reason,
          documentId: doc.id,
        });
      } catch (err) {
        console.warn(`Failed to send void email to ${r.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Document "${doc.title}" was voided successfully.`,
    });
  } catch (err: any) {
    console.error(`Error voiding document:`, err);
    return NextResponse.json({ error: err?.message || 'Failed to void document' }, { status: 500 });
  }
}

