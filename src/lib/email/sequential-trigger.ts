import { dbQuery } from '@/lib/db';
import { emailService } from '@/lib/email/service';
import { formatSaDate } from '@/lib/dates';
import { generateSecureToken, hashSigningToken } from '@/lib/security/crypto';

/**
 * Background Sequential Signer Engine
 * Automatically checks documents where sequential signing order is enforced.
 * Determines the active current signer, verifies all previous signers have completed,
 * and automatically triggers and delivers the signature invitation.
 */
export async function checkAndTriggerSequentialSigners(targetDocId?: string): Promise<{
  checkedDocuments: number;
  triggeredSigners: Array<{ documentId: string; recipientId: string; email: string; name: string }>;
}> {
  const triggeredSigners: Array<{ documentId: string; recipientId: string; email: string; name: string }> = [];

  try {
    // 1. Query active documents with signing order enforced
    let docQuery = `
      SELECT d.id, d.title, d.message, d.org_id, d.created_by, d.signing_order_enforced, d.status,
             o.name as org_name, o.custom_domain,
             u.full_name as creator_name, u.email as creator_email
      FROM documents d
      LEFT JOIN organisations o ON d.org_id = o.id
      LEFT JOIN profiles u ON d.created_by = u.id
      WHERE d.signing_order_enforced = true 
        AND d.status IN ('sent', 'partially_signed')
    `;
    const params: any[] = [];

    if (targetDocId) {
      docQuery += ` AND d.id = $1`;
      params.push(targetDocId);
    }

    const docsRes = await dbQuery(docQuery, params);

    for (const doc of docsRes.rows) {
      // 2. Fetch all recipients ordered by signing sequence
      const recipsRes = await dbQuery(
        `SELECT id, document_id, name, email, role, order_index, status, token_hash, token_expires_at, created_at
         FROM recipients
         WHERE document_id = $1
         ORDER BY order_index ASC, created_at ASC`,
        [doc.id]
      );

      const recips = recipsRes.rows;
      if (recips.length === 0) continue;

      // Find the first recipient who is not signed yet
      const currentSignerIndex = recips.findIndex((r) => r.status !== 'signed');

      if (currentSignerIndex === -1) {
        // All recipients have signed! Finalize document if not completed
        continue;
      }

      // Verify all preceding recipients have signed
      const precedingRecipients = recips.slice(0, currentSignerIndex);
      const allPrecedingSigned = precedingRecipients.every((r) => r.status === 'signed');

      if (!allPrecedingSigned) {
        // Preceding signer is still pending; wait for them
        continue;
      }

      const activeRecipient = recips[currentSignerIndex];

      // Check if invitation was already sent in email_log
      const emailLogRes = await dbQuery(
        `SELECT id, sent_at FROM email_log 
         WHERE document_id = $1 AND recipient_id = $2 AND status = 'sent'
         ORDER BY sent_at DESC LIMIT 1`,
        [doc.id, activeRecipient.id]
      );

      const hasSentRecently = emailLogRes.rows.length > 0;

      // If never sent or if it's the next signer following a previous signature
      if (!hasSentRecently || currentSignerIndex > 0) {
        // Check if there's already an audit event for this recipient's invitation
        const auditCheck = await dbQuery(
          `SELECT id FROM audit_events 
           WHERE document_id = $1 AND recipient_id = $2 AND event_type = 'invitation.sent' LIMIT 1`,
          [doc.id, activeRecipient.id]
        );

        if (auditCheck.rows.length === 0) {
          console.log(`[Sequential Engine] Triggering email for Signer #${currentSignerIndex + 1}: ${activeRecipient.name} (${activeRecipient.email}) on "${doc.title}"`);

          const rawToken = generateSecureToken();
          const tokenHash = hashSigningToken(rawToken);
          const tokenExpiresAt = activeRecipient.token_expires_at || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

          await dbQuery(
            `UPDATE recipients SET token_hash = $1, token_expires_at = $2 WHERE id = $3`,
            [tokenHash, tokenExpiresAt, activeRecipient.id]
          );

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lunar-sign.netlify.app';
          const signingUrl = `${appUrl}/s/${rawToken}`;
          const effectiveSenderName = doc.creator_name || doc.org_name || 'Lunar Sign Administrator';

          try {
            const sent = await emailService.sendSignatureRequest({
              to: activeRecipient.email,
              recipientName: activeRecipient.name,
              senderName: effectiveSenderName,
              documentTitle: doc.title,
              message: doc.message || 'Please review and sign this electronic document.',
              signingUrl,
              expiresAtFormatted: formatSaDate(tokenExpiresAt),
              documentId: doc.id,
              recipientId: activeRecipient.id,
              orgName: doc.org_name || 'Lunar Sign',
              primaryColor: '#4f46e5',
            });

            if (sent) {
              await dbQuery(
                `INSERT INTO audit_events (document_id, recipient_id, actor_type, event_type, description)
                 VALUES ($1, $2, 'system', 'invitation.sent', $3)`,
                [
                  doc.id,
                  activeRecipient.id,
                  `Sequential signature invitation dispatched to ${activeRecipient.name} (${activeRecipient.email}).`,
                ]
              );

              triggeredSigners.push({
                documentId: doc.id,
                recipientId: activeRecipient.id,
                email: activeRecipient.email,
                name: activeRecipient.name,
              });
            }
          } catch (sendErr) {
            console.error(`[Sequential Engine Error] Failed to send email to ${activeRecipient.email}:`, sendErr);
          }
        }
      }
    }

    return {
      checkedDocuments: docsRes.rows.length,
      triggeredSigners,
    };
  } catch (err) {
    console.error('[Sequential Engine Error]:', err);
    return { checkedDocuments: 0, triggeredSigners: [] };
  }
}
