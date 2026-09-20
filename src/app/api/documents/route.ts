import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';
import { generateSecureToken, hashSigningToken, sha256Hex } from '@/lib/security/crypto';
import { convertToPdf } from '@/lib/conversion';
import { emailService } from '@/lib/email/service';
import { formatSaDate } from '@/lib/dates';

const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().optional(),
  originalFilename: z.string().min(1),
  mimeType: z.string(),
  fileBase64: z.string(),
  signingOrderEnforced: z.boolean().default(false),
  autoSaveTemplate: z.boolean().optional().default(true),
  recipients: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.enum(['signer', 'approver', 'filler', 'viewer']).default('signer'),
      authMethod: z.enum(['none', 'access_code', 'email_otp']).default('none'),
      orderIndex: z.number().default(0),
    })
  ).min(1, 'At least one recipient is required'),
  fields: z.array(
    z.object({
      type: z.string(),
      page: z.number(),
      x_pct: z.number(),
      y_pct: z.number(),
      width_pct: z.number(),
      height_pct: z.number(),
      required: z.boolean().default(true),
      label: z.string().optional(),
      placeholder: z.string().optional(),
      value: z.string().optional(),
      recipientIndex: z.number().nullable(), // null = sender field
    })
  ),
});

/**
 * GET /api/documents - List all documents for the authenticated business
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';

    const docsRes = await dbQuery(
      `SELECT d.*,
              COUNT(r.id) AS total_recipients,
              COUNT(CASE WHEN r.status = 'signed' THEN 1 END) AS signed_recipients
       FROM documents d
       LEFT JOIN recipients r ON d.id = r.document_id
       WHERE d.org_id = $1
       GROUP BY d.id
       ORDER BY d.created_at DESC`,
      [orgId]
    );

    return NextResponse.json({ documents: docsRes.rows });
  } catch (err: any) {
    console.error('Error fetching documents:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list documents' }, { status: 500 });
  }
}

/**
 * POST /api/documents - Create and persist a new document envelope directly to live Supabase Postgres
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateDocumentSchema.parse(body);

    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';
    const userId = auth?.userId || '22222222-2222-2222-2222-222222222222';
    const senderName = auth?.fullName || 'Lunar Administrator';

    // Check organisation status and document limit (10 documents limit)
    const orgCheck = await dbQuery(
      `SELECT status, max_documents FROM organisations WHERE id = $1 LIMIT 1`,
      [orgId]
    );
    if (orgCheck.rows.length > 0) {
      const orgInfo = orgCheck.rows[0];
      if (orgInfo.status === 'pending_approval' && !auth?.isSuperAdmin) {
        return NextResponse.json(
          {
            error:
              'Your business account is pending approval by the platform administrator (admin@lunarposgeorge.co.za). You will be able to dispatch envelopes once approved.',
          },
          { status: 403 }
        );
      }
      if (orgInfo.status === 'suspended') {
        return NextResponse.json(
          { error: 'This business account has been suspended. Please contact platform support.' },
          { status: 403 }
        );
      }

      // Check current document count
      const countRes = await dbQuery(
        `SELECT COUNT(*) as count FROM documents WHERE org_id = $1`,
        [orgId]
      );
      const currentDocCount = parseInt(countRes.rows[0].count, 10) || 0;
      const maxDocs = orgInfo.max_documents || 10;
      if (currentDocCount >= maxDocs && !auth?.isSuperAdmin) {
        return NextResponse.json(
          {
            error: `Document limit reached (${currentDocCount}/${maxDocs}). Your business tier allows up to ${maxDocs} envelopes. Contact admin@lunarposgeorge.co.za to request an increase.`,
          },
          { status: 403 }
        );
      }
    }

    const fileBuffer = Buffer.from(validated.fileBase64, 'base64');
    const originalHash = sha256Hex(fileBuffer);

    // Convert / normalize to canonical PDF
    const conversionResult = await convertToPdf({
      fileName: validated.originalFilename,
      mimeType: validated.mimeType,
      buffer: fileBuffer,
    });

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    // 1. Insert Document into PostgreSQL
    const docRes = await dbQuery(
      `INSERT INTO documents (
        org_id, created_by, title, message, original_filename, original_mime_type,
        storage_path_original, storage_path_pdf, page_count, status, signing_order_enforced,
        original_hash, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent', $10, $11, $12)
      RETURNING *`,
      [
        orgId,
        userId,
        validated.title,
        validated.message || null,
        validated.originalFilename,
        validated.mimeType,
        `uploads/${Date.now()}_${validated.originalFilename}`,
        `canonical/${Date.now()}_canonical.pdf`,
        conversionResult.pageCount || 1,
        validated.signingOrderEnforced,
        originalHash,
        expiresAt,
      ]
    );

    const doc = docRes.rows[0];

    // 2. Insert Recipients
    const insertedRecipients: Array<{ id: string; email: string; name: string; token: string }> = [];
    const recipientIdMap = new Map<number, string>();

    for (let i = 0; i < validated.recipients.length; i++) {
      const r = validated.recipients[i];
      const rawToken = generateSecureToken();
      const tokenHash = hashSigningToken(rawToken);
      const tokenExpiresAt = expiresAt;

      const recipRes = await dbQuery(
        `INSERT INTO recipients (
          document_id, name, email, phone, role, order_index, status,
          token_hash, token_expires_at, auth_method
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
        RETURNING id`,
        [
          doc.id,
          r.name,
          r.email,
          r.phone || null,
          r.role,
          r.orderIndex ?? i,
          tokenHash,
          tokenExpiresAt,
          r.authMethod,
        ]
      );

      const recipId = recipRes.rows[0].id;
      recipientIdMap.set(i, recipId);

      insertedRecipients.push({
        id: recipId,
        email: r.email,
        name: r.name,
        token: rawToken,
      });

      // Auto-add or update signee in company customer list / address book
      try {
        const contactEmail = r.email.toLowerCase().trim();
        const existingContact = await dbQuery(
          `SELECT id FROM contacts WHERE org_id = $1 AND LOWER(email) = $2 LIMIT 1`,
          [orgId, contactEmail]
        );
        if (existingContact.rows.length === 0) {
          await dbQuery(
            `INSERT INTO contacts (org_id, name, email, phone, role)
             VALUES ($1, $2, $3, $4, $5)`,
            [orgId, r.name.trim(), contactEmail, r.phone || null, r.role || 'signer']
          );
        } else {
          await dbQuery(
            `UPDATE contacts SET name = $1, phone = COALESCE($2, phone), role = $3, updated_at = NOW()
             WHERE id = $4 AND org_id = $5`,
            [r.name.trim(), r.phone || null, r.role || 'signer', existingContact.rows[0].id, orgId]
          );
        }
      } catch (cErr) {
        console.warn('Auto-save contact warning:', cErr);
      }

      // Send Email Invitation to first recipient or all if non-sequential
      if (!validated.signingOrderEnforced || i === 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sign.lunaposgeorge.co.za';
        const signingUrl = `${appUrl}/s/${rawToken}`;

        emailService
          .sendSignatureRequest({
            to: r.email,
            recipientName: r.name,
            senderName,
            documentTitle: validated.title,
            message: validated.message,
            signingUrl,
            expiresAtFormatted: formatSaDate(tokenExpiresAt),
            documentId: doc.id,
            recipientId: recipId,
          })
          .catch((err) => console.error(`Error sending email to ${r.email}:`, err));
      }
    }

    // 3. Insert Fields with accurate Coordinates and Strict Arial Font Metadata
    for (const f of validated.fields) {
      const mappedRecipId = f.recipientIndex !== null ? recipientIdMap.get(f.recipientIndex) || null : null;

      await dbQuery(
        `INSERT INTO fields (
          document_id, recipient_id, type, page, x_pct, y_pct, width_pct, height_pct,
          required, label, placeholder, value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          doc.id,
          mappedRecipId,
          f.type,
          f.page,
          f.x_pct,
          f.y_pct,
          f.width_pct,
          f.height_pct,
          f.required,
          f.label || f.type,
          f.placeholder || null,
          f.value || null,
        ]
      );
    }

    // 4. Auto-save template if requested
    if (validated.autoSaveTemplate) {
      await dbQuery(
        `INSERT INTO templates (org_id, created_by, name, description, storage_path_pdf, field_definitions)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          orgId,
          userId,
          validated.title,
          `Template automatically saved from "${validated.title}"`,
          doc.storage_path_pdf,
          JSON.stringify(validated.fields),
        ]
      );
    }

    // 5. Log Audit Trail
    await dbQuery(
      `INSERT INTO audit_events (document_id, actor_type, event_type, description)
       VALUES ($1, 'admin', 'document.created', $2)`,
      [
        doc.id,
        `Document "${validated.title}" created with ${insertedRecipients.length} signers and ${validated.fields.length} fields.`,
      ]
    );

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      title: doc.title,
      recipients: insertedRecipients.map((r) => ({ name: r.name, email: r.email, token: r.token })),
    });
  } catch (err: unknown) {
    console.error('Error creating document:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to create document';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

/**
 * DELETE /api/documents - Bulk delete or void and remove documents
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentIds, action = 'delete', reason = 'Voided by administrator' } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'No document IDs provided' }, { status: 400 });
    }

    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';
    const isSuperAdmin = !!auth?.isSuperAdmin;
    const senderName = auth?.fullName || 'Administrator';

    if (action === 'delete' || action === 'void_remove') {
      // If notifying signers on bulk void & remove
      if (action === 'void_remove') {
        try {
          const recipsRes = await dbQuery(
            `SELECT r.email, r.name, d.title, d.id as doc_id
             FROM recipients r
             JOIN documents d ON r.document_id = d.id
             WHERE d.id::text = ANY($1) AND (d.org_id = $2 OR $3 = true) AND r.status != 'signed'`,
            [documentIds, orgId, isSuperAdmin]
          );
          for (const r of recipsRes.rows) {
            emailService
              .sendVoided({
                to: r.email,
                recipientName: r.name,
                senderName,
                documentTitle: r.title,
                voidReason: reason,
                documentId: r.doc_id,
              })
              .catch((e) => console.warn('Bulk void email warning:', e));
          }
        } catch (nErr) {
          console.warn('Failed sending void notifications during bulk deletion:', nErr);
        }
      }

      const delRes = await dbQuery(
        `DELETE FROM documents
         WHERE id::text = ANY($1) AND (org_id = $2 OR $3 = true)
         RETURNING id`,
        [documentIds, orgId, isSuperAdmin]
      );

      return NextResponse.json({
        success: true,
        deletedCount: delRes.rowCount,
        message: `Successfully removed ${delRes.rowCount} document envelope(s).`,
      });
    } else {
      // Mark status as voided
      const updateRes = await dbQuery(
        `UPDATE documents
         SET status = 'voided', voided_reason = $1, updated_at = NOW()
         WHERE id::text = ANY($2) AND (org_id = $3 OR $4 = true)
         RETURNING id, title`,
        [reason, documentIds, orgId, isSuperAdmin]
      );

      return NextResponse.json({
        success: true,
        updatedCount: updateRes.rowCount,
        message: `Successfully voided ${updateRes.rowCount} document envelope(s).`,
      });
    }
  } catch (err: any) {
    console.error('Error during bulk document action:', err);
    return NextResponse.json({ error: err?.message || 'Failed to process bulk document action' }, { status: 500 });
  }
}

