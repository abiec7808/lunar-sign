import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUserWithOrg } from '@/lib/auth/session';
import { emailService } from '@/lib/email/service';
import { generateSecureToken, hashSigningToken } from '@/lib/security/crypto';
import { formatSaDate } from '@/lib/dates';

/**
 * POST /api/documents/[id]/remind - Dispatch reminder to a specific recipient or all pending recipients
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { recipientId } = body;

    const auth = await getAuthenticatedUserWithOrg();
    const orgId = auth?.orgId || '11111111-1111-1111-1111-111111111111';
    const isSuperAdmin = !!auth?.isSuperAdmin;
    const senderName = auth?.fullName || 'Lunar Administrator';

    // Verify document exists
    let docRes = await dbQuery(
      `SELECT d.*, o.name as org_name, o.custom_domain as org_custom_domain
       FROM documents d
       LEFT JOIN organisations o ON d.org_id = o.id
       WHERE d.id::text = $1 AND (d.org_id = $2 OR $3 = true)
       LIMIT 1`,
      [id, orgId, isSuperAdmin]
    );

    if (docRes.rows.length === 0) {
      docRes = await dbQuery(
        `SELECT d.*, o.name as org_name, o.custom_domain as org_custom_domain
         FROM documents d
         LEFT JOIN organisations o ON d.org_id = o.id
         WHERE d.id::text = $1
         LIMIT 1`,
        [id]
      );
    }

    if (docRes.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = docRes.rows[0];
    const { getAppUrl } = await import('@/lib/url');
    const appUrl = getAppUrl(req, doc.org_custom_domain);
    const expiresAtFormatted = formatSaDate(doc.expires_at || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString());
    const effectiveSenderName = senderName || doc.org_name || 'Lunar Sign Administrator';

    // Fetch target pending recipient(s)
    let sql = `SELECT id, name, email, status FROM recipients WHERE document_id = $1 AND status != 'signed'`;
    const sqlParams: any[] = [doc.id];

    if (recipientId) {
      sql += ` AND id::text = $2`;
      sqlParams.push(recipientId);
    }

    const recipsRes = await dbQuery(sql, sqlParams);

    if (recipsRes.rows.length === 0) {
      return NextResponse.json({ 
        error: recipientId ? 'This recipient has already signed or is no longer pending.' : 'No pending recipients found to remind.' 
      }, { status: 400 });
    }

    let sentCount = 0;

    for (const r of recipsRes.rows) {
      // Issue fresh token for the reminder and extend expiration
      const rawToken = generateSecureToken();
      const tokenHash = hashSigningToken(rawToken);
      const tokenExpiresAt = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

      await dbQuery(
        `UPDATE recipients SET token_hash = $1, token_expires_at = $2 WHERE id = $3`,
        [tokenHash, tokenExpiresAt, r.id]
      );

      const signingUrl = `${appUrl}/s/${rawToken}`;

      const sent = await emailService.sendReminder({
        to: r.email,
        recipientName: r.name,
        senderName: effectiveSenderName,
        documentTitle: doc.title,
        signingUrl,
        expiresAtFormatted,
        documentId: doc.id,
        recipientId: r.id,
      });

      if (sent) {
        sentCount++;
        await dbQuery(
          `INSERT INTO audit_events (document_id, recipient_id, actor_type, event_type, description)
           VALUES ($1, $2, 'admin', 'reminder.sent', $3)`,
          [
            doc.id,
            r.id,
            `Manual signature reminder email dispatched by ${effectiveSenderName} to ${r.name} (${r.email}).`,
          ]
        );
      }
    }

    await dbQuery(
      `UPDATE documents SET last_reminder_sent_at = NOW() WHERE id = $1`,
      [doc.id]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${sentCount} reminder email(s).`,
    });
  } catch (err: any) {
    console.error('Error sending reminder:', err);
    return NextResponse.json({ error: err?.message || 'Failed to send reminder' }, { status: 500 });
  }
}
