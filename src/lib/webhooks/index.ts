import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { signWebhookPayload } from '@/lib/security/crypto';

export type WebhookEvent =
  | 'document.sent'
  | 'document.opened'
  | 'document.in_progress'
  | 'document.signed'
  | 'document.completed'
  | 'document.declined'
  | 'document.voided';

export interface WebhookPayload {
  event: WebhookEvent;
  document_id: string;
  org_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(event: WebhookEvent, orgId: string, documentId: string, data: Record<string, unknown>): Promise<void> {
  const supabase = getAdminSupabaseClient();

  try {
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (error || !webhooks || webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      document_id: documentId,
      org_id: orgId,
      timestamp: new Date().toISOString(),
      data,
    };

    const payloadString = JSON.stringify(payload);

    for (const webhook of webhooks) {
      if (!webhook.events || webhook.events.includes('*') || webhook.events.includes(event)) {
        const signature = signWebhookPayload(payloadString, webhook.secret);

        fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Lunar-Signature': signature,
            'X-Lunar-Event': event,
          },
          body: payloadString,
        }).catch((err) => {
          console.error(`Failed to deliver webhook to ${webhook.url}:`, err);
        });
      }
    }
  } catch (err) {
    console.error('Error dispatching webhooks:', err);
  }
}
