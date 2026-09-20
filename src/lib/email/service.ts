import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import React from 'react';
import { SignatureRequestEmail, SignatureRequestEmailProps } from '@/emails/SignatureRequestEmail';
import { DocumentCompletedEmail, DocumentCompletedEmailProps } from '@/emails/DocumentCompletedEmail';
import { SignedConfirmationEmail, SignedConfirmationEmailProps } from '@/emails/SignedConfirmationEmail';
import { ReminderEmail, ReminderEmailProps } from '@/emails/ReminderEmail';
import { DeclinedEmail, DeclinedEmailProps } from '@/emails/DeclinedEmail';
import { VoidedEmail, VoidedEmailProps } from '@/emails/VoidedEmail';
import { NewRegistrationAlertEmail, NewRegistrationAlertEmailProps } from '@/emails/NewRegistrationAlertEmail';

export interface SendEmailOptions {
  to: string;
  subject: string;
  reactElement: React.ReactElement;
  documentId?: string;
  recipientId?: string;
  templateName: string;
}

export interface IEmailService {
  sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendSignatureRequest(props: SignatureRequestEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean>;
  sendDocumentCompleted(props: DocumentCompletedEmailProps & { to: string; documentId: string; recipientId?: string }): Promise<boolean>;
  sendSignedConfirmation(props: SignedConfirmationEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean>;
  sendReminder(props: ReminderEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean>;
  sendDeclined(props: DeclinedEmailProps & { to: string; documentId: string }): Promise<boolean>;
  sendVoided(props: VoidedEmailProps & { to: string; documentId: string; recipientId?: string }): Promise<boolean>;
  sendNewRegistrationAlert(props: NewRegistrationAlertEmailProps & { to?: string }): Promise<boolean>;
}

export class ResendEmailService implements IEmailService {
  private resend: Resend;
  private fromEmail: string;
  private replyToEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY || 're_placeholder';
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'Lunar Sign <admin@lunarposgeorge.co.za>';
    this.replyToEmail = process.env.RESEND_REPLY_TO || 'admin@lunarposgeorge.co.za';
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, reactElement, documentId, recipientId, templateName } = options;

    try {
      const html = await render(reactElement);
      let text = '';
      try {
        text = await render(reactElement, { plainText: true });
      } catch {
        text = subject;
      }

      console.log(`[Resend] Dispatching "${templateName}" email to: ${to} (From: ${this.fromEmail})...`);

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        replyTo: this.replyToEmail,
        subject,
        html,
        text,
        headers: {
          'Auto-Submitted': 'auto-generated',
          'X-Entity-Ref-ID': documentId || 'lunar-sign',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const providerMessageId = data?.id;
      console.log(`[Resend] Successfully dispatched "${templateName}" email to: ${to} (Resend ID: ${providerMessageId})`);

      // Log send in PostgreSQL database
      try {
        const isValidUuid = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const { dbQuery } = await import('@/lib/db');

        let validDocId: string | null = null;
        let validRecipId: string | null = null;

        if (isValidUuid(documentId)) {
          const docCheck = await dbQuery('SELECT id FROM documents WHERE id = $1', [documentId]).catch(() => ({ rows: [] }));
          if (docCheck.rows.length > 0) validDocId = documentId!;
        }

        if (isValidUuid(recipientId)) {
          const recipCheck = await dbQuery('SELECT id FROM recipients WHERE id = $1', [recipientId]).catch(() => ({ rows: [] }));
          if (recipCheck.rows.length > 0) validRecipId = recipientId!;
        }

        await dbQuery(
          `INSERT INTO email_log (document_id, recipient_id, template, to_email, subject, provider_message_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'sent')`,
          [validDocId, validRecipId, templateName, to, subject, providerMessageId || null]
        ).catch(() => {});
      } catch (dbErr) {
        console.warn('Failed to insert email_log into database:', dbErr);
      }

      return { success: true, messageId: providerMessageId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown email sending error';
      console.error(`[Resend Error] Failed to send email to ${to}:`, errorMsg);

      try {
        const isValidUuid = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const { dbQuery } = await import('@/lib/db');

        let validDocId: string | null = null;
        let validRecipId: string | null = null;

        if (isValidUuid(documentId)) {
          const docCheck = await dbQuery('SELECT id FROM documents WHERE id = $1', [documentId]).catch(() => ({ rows: [] }));
          if (docCheck.rows.length > 0) validDocId = documentId!;
        }

        if (isValidUuid(recipientId)) {
          const recipCheck = await dbQuery('SELECT id FROM recipients WHERE id = $1', [recipientId]).catch(() => ({ rows: [] }));
          if (recipCheck.rows.length > 0) validRecipId = recipientId!;
        }

        await dbQuery(
          `INSERT INTO email_log (document_id, recipient_id, template, to_email, subject, status, error)
           VALUES ($1, $2, $3, $4, $5, 'failed', $6)`,
          [validDocId, validRecipId, templateName, to, subject, errorMsg]
        ).catch(() => {});
      } catch (logErr) {
        console.error('Failed to log email error to database:', logErr);
      }

      return { success: false, error: errorMsg };
    }
  }

  async sendSignatureRequest(props: SignatureRequestEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Signature Requested: ${props.documentTitle}`,
      reactElement: React.createElement(SignatureRequestEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'signature_request',
    });
    return res.success;
  }

  async sendDocumentCompleted(props: DocumentCompletedEmailProps & { to: string; documentId: string; recipientId?: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Completed: ${props.documentTitle}`,
      reactElement: React.createElement(DocumentCompletedEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'document_completed',
    });
    return res.success;
  }

  async sendSignedConfirmation(props: SignedConfirmationEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Signature Confirmed: ${props.documentTitle}`,
      reactElement: React.createElement(SignedConfirmationEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'signed_confirmation',
    });
    return res.success;
  }

  async sendReminder(props: ReminderEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Reminder: Please sign ${props.documentTitle}`,
      reactElement: React.createElement(ReminderEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'reminder',
    });
    return res.success;
  }

  async sendDeclined(props: DeclinedEmailProps & { to: string; documentId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Declined: ${props.documentTitle}`,
      reactElement: React.createElement(DeclinedEmail, props),
      documentId: props.documentId,
      templateName: 'declined',
    });
    return res.success;
  }

  async sendVoided(props: VoidedEmailProps & { to: string; documentId: string; recipientId?: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Document Voided: ${props.documentTitle}`,
      reactElement: React.createElement(VoidedEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'voided',
    });
    return res.success;
  }

  async sendNewRegistrationAlert(props: NewRegistrationAlertEmailProps & { to?: string }): Promise<boolean> {
    const recipient = props.to || 'admin@lunarposgeorge.co.za';
    const res = await this.sendEmail({
      to: recipient,
      subject: `🚀 New Business Registration: ${props.businessName} (Approval Needed)`,
      reactElement: React.createElement(NewRegistrationAlertEmail, props),
      templateName: 'super_admin_registration_alert',
    });
    return res.success;
  }
}

export class DirectSmtpEmailService implements IEmailService {
  private smtpTransporter: Transporter;
  private smtpUser: string;
  private fromName: string;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'mail.lunarposgeorge.co.za';
    this.smtpUser = process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL || 'admin@lunarposgeorge.co.za';
    const smtpPass = process.env.SMTP_PASS || 'Sharne2010!';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    this.fromName = process.env.SMTP_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Lunar Sign';

    this.smtpTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: this.smtpUser,
        pass: smtpPass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 25000,
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, reactElement, documentId, recipientId, templateName } = options;

    try {
      // Check if sent to this exact recipient in the last 2 minutes to protect cPanel hourly failure limit
      if (documentId && recipientId) {
        try {
          const { dbQuery } = await import('@/lib/db');
          const recentRes = await dbQuery(
            `SELECT id FROM email_log 
             WHERE document_id = $1 AND recipient_id = $2 AND template = $3 AND status = 'sent'
               AND sent_at > NOW() - INTERVAL '2 minutes' LIMIT 1`,
            [documentId, recipientId, templateName]
          );
          if (recentRes.rows.length > 0) {
            console.log(`[EmailService SMTP] Throttling duplicate send to ${to} (already sent in last 2 mins)`);
            return { success: true };
          }
        } catch {}
      }

      // 1. Render both HTML and clean PlainText versions for anti-spam gateway compliance
      const html = await render(reactElement);
      let text = '';
      try {
        text = await render(reactElement, { plainText: true });
      } catch {
        text = subject;
      }

      // 2. Dispatch purely via Direct SMTP (mail.lunarposgeorge.co.za)
      const info = await this.smtpTransporter.sendMail({
        from: {
          name: this.fromName,
          address: this.smtpUser,
        },
        sender: this.smtpUser,
        to,
        replyTo: this.smtpUser,
        subject,
        text,
        html,
        headers: {
          'Auto-Submitted': 'auto-generated',
          'X-Mailer': 'Lunar Sign/1.0',
        },
        envelope: {
          from: this.smtpUser,
          to: [to],
        },
      });

      const providerMessageId = info.messageId;
      console.log(`[EmailService SMTP] Successfully dispatched "${templateName}" email to: ${to} (MessageId: ${info.messageId})`);

      // 3. Log send directly in PostgreSQL database
      try {
        const isValidUuid = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const { dbQuery } = await import('@/lib/db');
        
        let validDocId: string | null = null;
        let validRecipId: string | null = null;

        if (isValidUuid(documentId)) {
          const docCheck = await dbQuery('SELECT id FROM documents WHERE id = $1', [documentId]).catch(() => ({ rows: [] }));
          if (docCheck.rows.length > 0) validDocId = documentId!;
        }

        if (isValidUuid(recipientId)) {
          const recipCheck = await dbQuery('SELECT id FROM recipients WHERE id = $1', [recipientId]).catch(() => ({ rows: [] }));
          if (recipCheck.rows.length > 0) validRecipId = recipientId!;
        }

        await dbQuery(
          `INSERT INTO email_log (document_id, recipient_id, template, to_email, subject, provider_message_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'sent')`,
          [validDocId, validRecipId, templateName, to, subject, providerMessageId || null]
        ).catch(() => {});
      } catch (dbErr) {
        console.warn('Failed to insert email_log into database:', dbErr);
      }

      return { success: true, messageId: providerMessageId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown email sending error';
      console.error(`[EmailService Error] Failed to send email to ${to}:`, errorMsg);

      try {
        const isValidUuid = (str?: string) => str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const { dbQuery } = await import('@/lib/db');

        let validDocId: string | null = null;
        let validRecipId: string | null = null;

        if (isValidUuid(documentId)) {
          const docCheck = await dbQuery('SELECT id FROM documents WHERE id = $1', [documentId]).catch(() => ({ rows: [] }));
          if (docCheck.rows.length > 0) validDocId = documentId!;
        }

        if (isValidUuid(recipientId)) {
          const recipCheck = await dbQuery('SELECT id FROM recipients WHERE id = $1', [recipientId]).catch(() => ({ rows: [] }));
          if (recipCheck.rows.length > 0) validRecipId = recipientId!;
        }

        await dbQuery(
          `INSERT INTO email_log (document_id, recipient_id, template, to_email, subject, status, error)
           VALUES ($1, $2, $3, $4, $5, 'failed', $6)`,
          [validDocId, validRecipId, templateName, to, subject, errorMsg]
        ).catch(() => {});
      } catch (logErr) {
        console.error('Failed to log email error to database:', logErr);
      }

      return { success: false, error: errorMsg };
    }
  }

  async sendSignatureRequest(props: SignatureRequestEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Signature Requested: ${props.documentTitle}`,
      reactElement: React.createElement(SignatureRequestEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'signature_request',
    });
    return res.success;
  }

  async sendDocumentCompleted(props: DocumentCompletedEmailProps & { to: string; documentId: string; recipientId?: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Completed: ${props.documentTitle}`,
      reactElement: React.createElement(DocumentCompletedEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'document_completed',
    });
    return res.success;
  }

  async sendSignedConfirmation(props: SignedConfirmationEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Signature Confirmed: ${props.documentTitle}`,
      reactElement: React.createElement(SignedConfirmationEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'signed_confirmation',
    });
    return res.success;
  }

  async sendReminder(props: ReminderEmailProps & { to: string; documentId: string; recipientId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Reminder: Please sign ${props.documentTitle}`,
      reactElement: React.createElement(ReminderEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'reminder',
    });
    return res.success;
  }

  async sendDeclined(props: DeclinedEmailProps & { to: string; documentId: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Declined: ${props.documentTitle}`,
      reactElement: React.createElement(DeclinedEmail, props),
      documentId: props.documentId,
      templateName: 'declined',
    });
    return res.success;
  }

  async sendVoided(props: VoidedEmailProps & { to: string; documentId: string; recipientId?: string }): Promise<boolean> {
    const res = await this.sendEmail({
      to: props.to,
      subject: `Document Voided: ${props.documentTitle}`,
      reactElement: React.createElement(VoidedEmail, props),
      documentId: props.documentId,
      recipientId: props.recipientId,
      templateName: 'voided',
    });
    return res.success;
  }

  async sendNewRegistrationAlert(props: NewRegistrationAlertEmailProps & { to?: string }): Promise<boolean> {
    const recipient = props.to || 'admin@lunarposgeorge.co.za';
    const res = await this.sendEmail({
      to: recipient,
      subject: `🚀 New Business Registration: ${props.businessName} (Approval Needed)`,
      reactElement: React.createElement(NewRegistrationAlertEmail, props),
      templateName: 'super_admin_registration_alert',
    });
    return res.success;
  }
}

export const emailService: IEmailService = process.env.RESEND_API_KEY
  ? new ResendEmailService()
  : new DirectSmtpEmailService();

