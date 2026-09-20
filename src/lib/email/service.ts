import { Resend } from 'resend';
import nodemailer, { type Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import React from 'react';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
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

export class HybridEmailService implements IEmailService {
  private resend: Resend | null = null;
  private smtpTransporter: Transporter | null = null;
  private fromEmail: string;
  private replyTo: string;

  constructor() {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && !resendApiKey.includes('placeholder')) {
      this.resend = new Resend(resendApiKey);
    }

    const smtpHost = process.env.SMTP_HOST || 'mail.lunarposgeorge.co.za';
    const smtpUser = process.env.SMTP_USER || 'admin@lunarposgeorge.co.za';
    const smtpPass = process.env.SMTP_PASS || 'Sharne2010!';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

    if (smtpHost && smtpUser && smtpPass) {
      this.smtpTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    this.fromEmail = process.env.RESEND_FROM_EMAIL || `"Lunar Sign" <${smtpUser || 'admin@lunarposgeorge.co.za'}>`;
    this.replyTo = process.env.RESEND_REPLY_TO || smtpUser || 'support@lunarposgeorge.co.za';
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { to, subject, reactElement, documentId, recipientId, templateName } = options;
    const supabase = getAdminSupabaseClient();

    try {
      const html = await render(reactElement);
      let providerMessageId: string | undefined = undefined;

      // 1. Prefer Direct SMTP if configured (e.g. mail.lunarposgeorge.co.za)
      if (this.smtpTransporter) {
        const info = await this.smtpTransporter.sendMail({
          from: this.fromEmail,
          to,
          replyTo: this.replyTo,
          subject,
          html,
        });
        providerMessageId = info.messageId;
      } else if (this.resend) {
        // 2. Fallback to Resend API
        const response = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          replyTo: this.replyTo,
          subject,
          html,
        });

        if (response.error) {
          throw new Error(response.error.message);
        }
        providerMessageId = response.data?.id;
      } else {
        providerMessageId = `mock_msg_${Date.now()}`;
        console.log(`[EmailService DEV] Sent "${templateName}" email to: ${to} (Subject: ${subject})`);
      }

      // Log send in database
      await supabase.from('email_log').insert({
        document_id: documentId || null,
        recipient_id: recipientId || null,
        template: templateName,
        to_email: to,
        subject,
        provider_message_id: providerMessageId,
        status: 'sent',
      });

      return { success: true, messageId: providerMessageId };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown email sending error';
      console.error(`[EmailService Error] Failed to send email to ${to}:`, errorMsg);

      try {
        await supabase.from('email_log').insert({
          document_id: documentId || null,
          recipient_id: recipientId || null,
          template: templateName,
          to_email: to,
          subject,
          status: 'failed',
          error: errorMsg,
        });
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

export const emailService: IEmailService = new HybridEmailService();
