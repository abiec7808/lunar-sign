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

export interface DocumentCompletedEmailProps {
  recipientName: string;
  documentTitle: string;
  downloadUrl: string;
  verifyUrl: string;
  finalHash: string;
  completedAtFormatted: string;
  orgName?: string;
  primaryColor?: string;
  footerText?: string;
}

export function DocumentCompletedEmail({
  recipientName = 'Signatory',
  documentTitle = 'Executed Service Agreement',
  downloadUrl = 'https://sign.lunaposgeorge.co.za/verify/sample_doc_id',
  verifyUrl = 'https://sign.lunaposgeorge.co.za/verify/sample_doc_id',
  finalHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  completedAtFormatted = '19 September 2026, 14:30 SAST',
  orgName = 'LunarPOS George / Computer Home Services',
  primaryColor = '#10b981', // Emerald for completed
  footerText = 'Lunar Sign - Valid under South African ECTA 25 of 2002.',
}: DocumentCompletedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Completed & Signed: "${documentTitle}"`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: primaryColor }}>
            <Heading style={headerTitle}>Lunar Sign</Heading>
            <Text style={headerSubtitle}>Document Fully Executed</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              All Parties Have Signed
            </Heading>
            <Text style={paragraph}>Hello {recipientName},</Text>
            <Text style={paragraph}>
              All required parties have completed their electronic signatures on <strong>"{documentTitle}"</strong>.
              The finalised, tamper-evident PDF and the official South African ECTA Signature Certificate are now available.
            </Text>

            <Section style={infoCard}>
              <Text style={infoRow}>
                <strong>Document Title:</strong> {documentTitle}
              </Text>
              <Text style={infoRow}>
                <strong>Completed On:</strong> {completedAtFormatted}
              </Text>
              <Text style={infoRow}>
                <strong>Integrity SHA-256 Hash:</strong>
                <br />
                <code style={hashCode}>{finalHash}</code>
              </Text>
            </Section>

            <Section style={btnSection}>
              <Button style={{ ...button, backgroundColor: primaryColor }} href={downloadUrl}>
                Download Signed PDF & Certificate
              </Button>
            </Section>

            <Text style={subtext}>
              You can verify the authenticity and cryptographic seal of this document at any time on the public verification portal:{' '}
              <a href={verifyUrl} style={{ color: '#4f46e5' }}>
                {verifyUrl}
              </a>
            </Text>

            <Hr style={hr} />

            <Text style={legalNotice}>
              <strong>South African ECTA 25 of 2002 Notice:</strong> In terms of Section 15 of ECTA, a data message made in the ordinary
              course of business is admissible in evidence and rebuttably presumed to be correct. The integrity of this file is
              cryptographically secured against post-signing alteration.
            </Text>

            <Text style={footer}>{footerText}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DocumentCompletedEmail;

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
};

const headerSubtitle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.9)',
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

const infoCard: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const infoRow: React.CSSProperties = {
  fontSize: '14px',
  color: '#334155',
  margin: '6px 0',
};

const hashCode: React.CSSProperties = {
  fontSize: '11px',
  fontFamily: 'monospace',
  backgroundColor: '#e2e8f0',
  padding: '3px 6px',
  borderRadius: '4px',
  wordBreak: 'break-all',
  display: 'inline-block',
  marginTop: '4px',
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
