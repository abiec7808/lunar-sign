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

export interface VoidedEmailProps {
  recipientName: string;
  senderName: string;
  documentTitle: string;
  voidReason?: string | null;
}

export function VoidedEmail({
  recipientName = 'Signatory',
  senderName = 'Admin',
  documentTitle = 'Service Agreement',
  voidReason = 'Document cancelled by sender.',
}: VoidedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Document Voided: "${documentTitle}"`}</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '580px', margin: '30px auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: '#64748b', padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>Document Voided</Heading>
          </Section>
          <Section style={{ padding: '32px 28px' }}>
            <Heading as="h3" style={{ color: '#0f172a', margin: '0 0 16px' }}>Signing Cancelled</Heading>
            <Text style={{ fontSize: '15px', color: '#334155', lineHeight: '24px' }}>
              Hello {recipientName}, please note that <strong>"{documentTitle}"</strong> has been voided by <strong>{senderName}</strong>.
            </Text>
            {voidReason && (
              <Section style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
                <Text style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
                  <strong>Reason:</strong> "{voidReason}"
                </Text>
              </Section>
            )}
            <Text style={{ fontSize: '14px', color: '#64748b' }}>
              All outstanding signing links for this document are now invalidated.
            </Text>
            <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
            <Text style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Lunar Sign — South Africa ECTA 25 of 2002
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default VoidedEmail;
