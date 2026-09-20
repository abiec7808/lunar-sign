import { dbQuery } from '@/lib/db';
import { emailService } from '@/lib/email/service';
import { generateSecureToken, hashSigningToken } from '@/lib/security/crypto';
import { formatSaDate } from '@/lib/dates';

export interface ReminderCheckResult {
  documentsChecked: number;
  remindersSent: number;
  documentsExpired: number;
  details: Array<{
    documentId: string;
    documentTitle: string;
    recipientEmail: string;
    status: string;
  }>;
}

/**
 * Checks for documents expiring in ~1 day and dispatches reminder emails to pending signers.
 * Also expires documents that have passed their 5-day expiration timestamp.
 */
export async function processExpiringDocumentReminders(): Promise<ReminderCheckResult> {
  const result: ReminderCheckResult = {
    documentsChecked: 0,
    remindersSent: 0,
    documentsExpired: 0,
    details: [],
  };

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sign.lunaposgeorge.co.za';

    // 1. Mark expired documents where expires_at <= NOW()
    const expiredRes = await dbQuery(
      `SELECT id, title FROM documents 
       WHERE status IN ('sent', 'partially_signed') 
         AND expires_at IS NOT NULL 
         AND expires_at <= NOW()`
    );

    for (const expDoc of expiredRes.rows) {
      await dbQuery(
        `UPDATE documents SET status = 'voided', voided_reason = 'Expired after 5 days without completion', updated_at = NOW() WHERE id = $1`,
        [expDoc.id]
      );
      await dbQuery(
        `INSERT INTO audit_events (document_id, actor_type, event_type, description)
         VALUES ($1, 'system', 'document.expired', 'Document envelope expired automatically after 5 days.')`,
        [expDoc.id]
      );
      result.documentsExpired++;
    }

    // 2. Query documents expiring in <= 28 hours (1 day window) where reminder not sent within last 20 hours
    const expiringDocsRes = await dbQuery(
      `SELECT d.id, d.title, d.expires_at, d.signing_order_enforced,
              u.full_name as sender_name, o.name as org_name
       FROM documents d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN organisations o ON d.org_id = o.id
       WHERE d.status IN ('sent', 'partially_signed')
         AND d.expires_at IS NOT NULL
         AND d.expires_at > NOW()
         AND d.expires_at <= NOW() + INTERVAL '28 hours'
         AND (d.last_reminder_sent_at IS NULL OR d.last_reminder_sent_at < NOW() - INTERVAL '20 hours')`
    );

    result.documentsChecked = expiringDocsRes.rows.length;

    for (const doc of expiringDocsRes.rows) {
      const senderName = doc.sender_name || doc.org_name || 'Lunar Sign Administrator';
      const expiresAtFormatted = formatSaDate(doc.expires_at);

      // Fetch pending signers for this document
      const recipsRes = await dbQuery(
        `SELECT id, name, email, order_index, status 
         FROM recipients 
         WHERE document_id = $1 AND status != 'signed'
         ORDER BY order_index ASC`,
        [doc.id]
      );

      if (recipsRes.rows.length === 0) continue;

      // If sequential signing is enforced, only remind the currently pending signer in order
      const recipientsToRemind = doc.signing_order_enforced
        ? [recipsRes.rows[0]]
        : recipsRes.rows;

      let anySentForDoc = false;

      for (const recipient of recipientsToRemind) {
        // Rotate / issue fresh signing token for the reminder link
        const rawToken = generateSecureToken();
        const tokenHash = hashSigningToken(rawToken);

        await dbQuery(
          `UPDATE recipients SET token_hash = $1 WHERE id = $2`,
          [tokenHash, recipient.id]
        );

        const signingUrl = `${appUrl}/s/${rawToken}`;

        try {
          const sent = await emailService.sendReminder({
            to: recipient.email,
            recipientName: recipient.name,
            senderName,
            documentTitle: doc.title,
            signingUrl,
            expiresAtFormatted,
            documentId: doc.id,
            recipientId: recipient.id,
          });

          if (sent) {
            result.remindersSent++;
            anySentForDoc = true;
            result.details.push({
              documentId: doc.id,
              documentTitle: doc.title,
              recipientEmail: recipient.email,
              status: 'sent',
            });

            await dbQuery(
              `INSERT INTO audit_events (document_id, recipient_id, actor_type, event_type, description)
               VALUES ($1, $2, 'system', 'reminder.sent', $3)`,
              [
                doc.id,
                recipient.id,
                `Automatic 24-hour pre-expiration reminder email dispatched to ${recipient.name} (${recipient.email}). Expiration: ${expiresAtFormatted}`,
              ]
            );
          }
        } catch (err: any) {
          console.error(`Failed to send reminder to ${recipient.email}:`, err);
          result.details.push({
            documentId: doc.id,
            documentTitle: doc.title,
            recipientEmail: recipient.email,
            status: `error: ${err?.message}`,
          });
        }
      }

      if (anySentForDoc) {
        await dbQuery(
          `UPDATE documents SET last_reminder_sent_at = NOW() WHERE id = $1`,
          [doc.id]
        );
      }
    }

    return result;
  } catch (error) {
    console.error('Error running automated reminder processor:', error);
    throw error;
  }
}
