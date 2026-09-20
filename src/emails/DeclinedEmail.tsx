import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface DeclinedEmailProps {
  senderName: string;
  recipientName: string;
  documentTitle: string;
  reason: string;
}

export function DeclinedEmail({
  senderName = 'Admin',
  recipientName = 'Signatory',
  documentTitle = 'Service Agreement',
  reason = 'Terms require revision.',
}: DeclinedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Declined: "${documentTitle}"`}</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '580px', margin: '30px auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#ef4444', padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>Document Declined</Heading>
          </Section>
          <Section style={{ padding: '32px 28px' }}>
            <Heading as="h3" style={{ color: '#0f172a', margin: '0 0 16px' }}>Signer Declined to Sign</Heading>
            <Text style={{ fontSize: '15px', color: '#334155', lineHeight: '24px' }}>
              Hello {senderName}, <strong>{recipientName}</strong> has declined to sign <strong>"{documentTitle}"</strong>.
            </Text>
            <Section style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
              <Text style={{ fontSize: '14px', color: '#991b1b', margin: 0 }}>
                <strong>Reason given:</strong> "{reason}"
              </Text>
            </Section>
            <Text style={{ fontSize: '14px', color: '#64748b' }}>
              The envelope workflow has been stopped. You can view the document details in your admin dashboard.
            </Text>
            <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
            <Text style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Lunar Sign — Audit trail updated
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DeclinedEmail;
