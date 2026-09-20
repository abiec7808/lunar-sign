import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery } from '@/lib/db';
import { hashSigningToken } from '@/lib/security/crypto';
import { emailService } from '@/lib/email/service';
import { formatSaDateTime } from '@/lib/dates';
import { dispatchWebhook } from '@/lib/webhooks';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const tokenHash = hashSigningToken(token);

    // Look up recipient and document from Postgres
    const recipRes = await dbQuery(
      `SELECT r.*,
              d.id as doc_id, d.title as doc_title, d.message as doc_message,
              d.page_count as doc_page_count, d.status as doc_status, d.org_id as doc_org_id,
              d.signing_order_enforced as doc_signing_order_enforced,
              d.pdf_base64 as doc_pdf_base64
       FROM recipients r
       JOIN documents d ON r.document_id = d.id
       WHERE r.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (recipRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired signing link.' }, { status: 404 });
    }

    const r = recipRes.rows[0];

    // Check expiry
    if (new Date(r.token_expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This signing link has expired.' }, { status: 410 });
    }

    // Check if sequential signing order is enforced and previous signer has not signed
    let isWaitingForPreviousSigner = false;
    let previousSignerName = '';
    let previousSignerOrder = 1;

    if (r.doc_signing_order_enforced && (r.order_index ?? 0) > 0) {
      const precedingRes = await dbQuery(
        `SELECT name, order_index, email FROM recipients
         WHERE document_id = $1 AND order_index < $2 AND status != 'signed'
         ORDER BY order_index ASC
         LIMIT 1`,
        [r.doc_id, r.order_index]
      );

      if (precedingRes.rows.length > 0) {
        isWaitingForPreviousSigner = true;
        previousSignerName = precedingRes.rows[0].name || precedingRes.rows[0].email;
        previousSignerOrder = (precedingRes.rows[0].order_index ?? 0) + 1;
      }
    }

    // Mark recipient as opened if currently pending
    if (r.status === 'pending') {
      await dbQuery(
        `UPDATE recipients SET status = 'opened', opened_at = NOW() WHERE id = $1`,
        [r.id]
      );
    }

    // Fetch document fields from Postgres fields table
    const fieldsRes = await dbQuery(
      `SELECT * FROM fields WHERE document_id = $1 ORDER BY page ASC, y_pct ASC`,
      [r.doc_id]
    );

    return NextResponse.json({
      recipient: {
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        orderIndex: r.order_index,
        status: r.status,
        authMethod: r.auth_method,
        consentGivenAt: r.consent_given_at,
      },
      document: {
        id: r.doc_id,
        title: r.doc_title,
        message: r.doc_message,
        pageCount: r.doc_page_count,
        status: r.doc_status,
        signingOrderEnforced: r.doc_signing_order_enforced,
        pdfBase64: r.doc_pdf_base64 || null,
      },
      fields: fieldsRes.rows,
      isWaitingForPreviousSigner,
      previousSignerName,
      previousSignerOrder,
    });
  } catch (err: any) {
    console.error('Error fetching signing token session:', err);
    return NextResponse.json({ error: err?.message || 'Failed to load signing session' }, { status: 500 });
  }
}

const SubmitFieldsSchema = z.object({
  consentGiven: z.boolean(),
  accessCode: z.string().optional(),
  fieldValues: z.record(z.string(), z.string()),
  signatures: z.array(
    z.object({
      fieldId: z.string(),
      method: z.enum(['drawn', 'typed', 'uploaded']),
      signatureData: z.string(),
      fontFamily: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const tokenHash = hashSigningToken(token);

    const body = await req.json();
    const validated = SubmitFieldsSchema.parse(body);

    // 1. Look up recipient and document
    const recipRes = await dbQuery(
      `SELECT r.*,
              d.id as doc_id, d.title as doc_title, d.org_id as doc_org_id, d.status as doc_status,
              d.signing_order_enforced as doc_signing_order_enforced,
              o.custom_domain as org_custom_domain
       FROM recipients r
       JOIN documents d ON r.document_id = d.id
       LEFT JOIN organisations o ON d.org_id = o.id
       WHERE r.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (recipRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid signing session.' }, { status: 404 });
    }

    const recipient = recipRes.rows[0];

    // If sequential signing is enforced, verify that all previous signers have already signed
    if (recipient.doc_signing_order_enforced && (recipient.order_index ?? 0) > 0) {
      const precedingRes = await dbQuery(
        `SELECT name, order_index, email FROM recipients
         WHERE document_id = $1 AND order_index < $2 AND status != 'signed'
         ORDER BY order_index ASC
         LIMIT 1`,
        [recipient.doc_id, recipient.order_index]
      );

      if (precedingRes.rows.length > 0) {
        const prevSigner = precedingRes.rows[0];
        return NextResponse.json(
          {
            error: `Sequential signing is enforced. Please wait for Signer #${(prevSigner.order_index ?? 0) + 1} (${prevSigner.name || prevSigner.email}) to sign first.`,
          },
          { status: 403 }
        );
      }
    }

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';
    const nowIso = new Date().toISOString();

    // 2. Update recipient status to signed
    await dbQuery(
      `UPDATE recipients
       SET status = 'signed',
           signed_at = $1,
           consent_given_at = $1,
           ip_address = $2,
           user_agent = $3
       WHERE id = $4`,
      [nowIso, ip, userAgent, recipient.id]
    );

    // 3. Save field values into PostgreSQL fields table
    for (const [fieldId, val] of Object.entries(validated.fieldValues)) {
      await dbQuery(
        `UPDATE fields SET value = $1, completed_at = NOW() WHERE id::text = $2 AND document_id = $3`,
        [val, fieldId, recipient.doc_id]
      );
    }

    // 4. Save signatures
    for (const sig of validated.signatures) {
      await dbQuery(
        `INSERT INTO signatures (
          field_id, recipient_id, method, signature_data,
          font_family, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (field_id) DO UPDATE SET
          signature_data = EXCLUDED.signature_data,
          font_family = EXCLUDED.font_family,
          ip_address = EXCLUDED.ip_address,
          user_agent = EXCLUDED.user_agent`,
        [
          sig.fieldId,
          recipient.id,
          sig.method,
          sig.signatureData,
          sig.fontFamily || null,
          ip,
          userAgent,
        ]
      );
    }

    // 5. Log Audit Event
    await dbQuery(
      `INSERT INTO audit_events (document_id, recipient_id, actor_type, event_type, description, ip_address, user_agent)
       VALUES ($1, $2, 'recipient', 'signature.affixed', $3, $4, $5)`,
      [
        recipient.doc_id,
        recipient.id,
        `Signer ${recipient.name} (${recipient.email}) consented to ECTA and completed signing.`,
        ip,
        userAgent,
      ]
    );

    // Auto-save signer into company contacts / customer list
    try {
      if (recipient.doc_org_id) {
        const contactEmail = recipient.email.toLowerCase().trim();
        const existingContact = await dbQuery(
          `SELECT id FROM contacts WHERE org_id = $1 AND LOWER(email) = $2 LIMIT 1`,
          [recipient.doc_org_id, contactEmail]
        );
        if (existingContact.rows.length === 0) {
          await dbQuery(
            `INSERT INTO contacts (org_id, name, email, role)
             VALUES ($1, $2, $3, $4)`,
            [recipient.doc_org_id, recipient.name.trim(), contactEmail, recipient.role || 'signer']
          );
        } else {
          await dbQuery(
            `UPDATE contacts SET name = $1, role = $2, updated_at = NOW()
             WHERE id = $3 AND org_id = $4`,
            [recipient.name.trim(), recipient.role || 'signer', existingContact.rows[0].id, recipient.doc_org_id]
          );
        }
      }
    } catch (cErr) {
      console.warn('Auto-save signer to contacts warning:', cErr);
    }

    // 6. Send Signed Confirmation Email
    try {
      await emailService.sendSignedConfirmation({
        to: recipient.email,
        recipientName: recipient.name,
        documentTitle: recipient.doc_title,
        signedAtFormatted: formatSaDateTime(nowIso),
        documentId: recipient.doc_id,
        recipientId: recipient.id,
      });
    } catch (err) {
      console.warn(`Failed to send signed confirmation email to ${recipient.email}:`, err);
    }

    // 7. Check if all recipients have signed
    const allRecipsRes = await dbQuery(
      `SELECT id, name, email, order_index, status, token_expires_at FROM recipients WHERE document_id = $1 ORDER BY order_index ASC`,
      [recipient.doc_id]
    );

    const pendingRecips = allRecipsRes.rows.filter((r) => r.status !== 'signed');

    if (pendingRecips.length === 0) {
      // Document is completed!
      await dbQuery(
        `UPDATE documents SET status = 'completed', completed_at = $1 WHERE id = $2`,
        [nowIso, recipient.doc_id]
      );

      await dbQuery(
        `INSERT INTO audit_events (document_id, actor_type, event_type, description)
         VALUES ($1, 'system', 'document.completed', $2)`,
        [
          recipient.doc_id,
          'All recipients have signed. Cryptographic seal & Signature Certificate generated.',
        ]
      );

      // Fetch document creator email to notify
      const docCreatorRes = await dbQuery(
        `SELECT u.email as creator_email, u.full_name as creator_name
         FROM documents d
         LEFT JOIN users u ON d.created_by = u.id
         WHERE d.id = $1 LIMIT 1`,
        [recipient.doc_id]
      );

      const creatorEmail = docCreatorRes.rows[0]?.creator_email || 'admin@lunarposgeorge.co.za';
      const creatorName = docCreatorRes.rows[0]?.creator_name || 'Lunar Administrator';

      try {
        const { getAppUrl } = await import('@/lib/url');
        const appUrl = getAppUrl(req, recipient.org_custom_domain);
        await emailService.sendDocumentCompleted({
          to: creatorEmail,
          recipientName: creatorName,
          documentTitle: recipient.doc_title,
          completedAtFormatted: formatSaDateTime(nowIso),
          downloadUrl: `${appUrl}/api/documents/${recipient.doc_id}/download?type=pdf`,
          verifyUrl: `${appUrl}/verify/${recipient.doc_id}`,
          documentId: recipient.doc_id,
        });
      } catch (cErr) {
        console.warn('Failed to send document completed email to creator:', cErr);
      }

      dispatchWebhook('document.completed', recipient.doc_org_id, recipient.doc_id, {
        title: recipient.doc_title,
        completedAt: nowIso,
      }).catch(console.error);
    } else {
      // If sequential signing is enabled, notify the next recipient in order
      const docOrderRes = await dbQuery(
        `SELECT signing_order_enforced, message FROM documents WHERE id = $1 LIMIT 1`,
        [recipient.doc_id]
      );
      if (docOrderRes.rows[0]?.signing_order_enforced) {
        const nextRecip = pendingRecips[0];
        if (nextRecip) {
          const { generateSecureToken, hashSigningToken } = await import('@/lib/security/crypto');
          const nextRawToken = generateSecureToken();
          const nextTokenHash = hashSigningToken(nextRawToken);
          await dbQuery(
            `UPDATE recipients SET token_hash = $1 WHERE id = $2`,
            [nextTokenHash, nextRecip.id]
          );
          const { getAppUrl } = await import('@/lib/url');
          const appUrl = getAppUrl(req, recipient.org_custom_domain);
          const signingUrl = `${appUrl}/s/${nextRawToken}`;
          const { formatSaDate } = await import('@/lib/dates');

          try {
            await emailService.sendSignatureRequest({
              to: nextRecip.email,
              recipientName: nextRecip.name,
              senderName: recipient.name,
              documentTitle: recipient.doc_title,
              message: docOrderRes.rows[0].message,
              signingUrl,
              expiresAtFormatted: formatSaDate(nextRecip.token_expires_at),
              documentId: recipient.doc_id,
              recipientId: nextRecip.id,
            });
          } catch (nErr) {
            console.error('Failed to notify next sequential signer:', nErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: pendingRecips.length === 0 ? 'completed' : 'partially_signed',
      completedAt: nowIso,
    });
  } catch (err: unknown) {
    console.error('Error submitting signature:', err);
    const errorMsg = err instanceof Error ? err.message : 'Failed to submit signature';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
