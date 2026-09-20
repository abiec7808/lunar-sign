import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface SignatureRequestEmailProps {
  recipientName: string;
  senderName: string;
  documentTitle: string;
  message?: string | null;
  signingUrl: string;
  expiresAtFormatted: string;
  orgName?: string;
  primaryColor?: string;
  footerText?: string;
}

export function SignatureRequestEmail({
  recipientName = 'Valued Signer',
  senderName = 'Lunar Admin',
  documentTitle = 'Service Agreement',
  message = 'Please review and sign this electronic document at your earliest convenience.',
  signingUrl = 'https://lunar-sign.netlify.app/s/sample_token',
  expiresAtFormatted = '30 October 2026',
  orgName = 'LunarPOS George / Computer Home Services',
  primaryColor = '#4f46e5',
  footerText = 'Valid under SA Electronic Communications and Transactions Act 25 of 2002.',
}: SignatureRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${senderName} has requested your signature on "${documentTitle}"`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: primaryColor }}>
            <Heading style={headerTitle}>Lunar Sign</Heading>
            <Text style={headerSubtitle}>{orgName}</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Signature Requested
            </Heading>
            <Text style={paragraph}>Hello {recipientName},</Text>
            <Text style={paragraph}>
              <strong>{senderName}</strong> has sent you a document to review and sign electronically:
            </Text>

            <Section style={docCard}>
              <Text style={docTitle}>📄 {documentTitle}</Text>
              {message && <Text style={docMessage}>"{message}"</Text>}
            </Section>

            <Section style={btnSection}>
              <Button style={{ ...button, backgroundColor: primaryColor }} href={signingUrl}>
                Review & Sign Document
              </Button>
            </Section>

            <Text style={subtext}>
              This link is secure, unique to you, and will expire on <strong>{expiresAtFormatted}</strong>.
              No account creation or password is required.
            </Text>

            <Hr style={hr} />

            <Text style={legalNotice}>
              <strong>Legal Compliance:</strong> This document is issued in terms of Section 13 of the South African
              Electronic Communications and Transactions Act 25 of 2002 (ECTA). Signatures executed on this platform
              generate an immutable cryptographic audit trail.
            </Text>

            <Text style={footer}>{footerText}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default SignatureRequestEmail;

const main: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  maxWidth: '580px',
  margin: '30px auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
};

const header: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
};

const headerTitle: React.CSSProperties = {
  color: '#ffffff',
  margin: '0',
  fontSize: '24px',
  fontWeight: 'bold',
  letterSpacing: '-0.5px',
};

const headerSubtitle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.85)',
  margin: '4px 0 0 0',
  fontSize: '13px',
};

const content: React.CSSProperties = {
  padding: '32px 28px',
};

const heading: React.CSSProperties = {
  fontSize: '20px',
  color: '#0f172a',
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 12px',
};

const docCard: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const docTitle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0',
};

const docMessage: React.CSSProperties = {
  fontSize: '14px',
  fontStyle: 'italic',
  color: '#64748b',
  margin: '8px 0 0',
};

const btnSection: React.CSSProperties = {
  textAlign: 'center',
  margin: '28px 0',
};

const button: React.CSSProperties = {
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '15px',
  textDecoration: 'none',
  display: 'inline-block',
};

const subtext: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '20px',
  textAlign: 'center',
  margin: '0 0 20px',
};

const hr: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: '24px 0',
};

const legalNotice: React.CSSProperties = {
  fontSize: '11px',
  lineHeight: '16px',
  color: '#94a3b8',
  margin: '0 0 12px',
};

const footer: React.CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  textAlign: 'center',
  margin: '0',
};
