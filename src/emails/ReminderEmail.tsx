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

export interface ReminderEmailProps {
  recipientName: string;
  senderName: string;
  documentTitle: string;
  signingUrl: string;
  expiresAtFormatted: string;
  primaryColor?: string;
}

export function ReminderEmail({
  recipientName = 'Signer',
  senderName = 'Lunar Admin',
  documentTitle = 'Service Agreement',
  signingUrl = 'https://lunar-sign.netlify.app/s/token',
  expiresAtFormatted = '30 October 2026',
  primaryColor = '#f59e0b', // Amber
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Reminder: Please sign "${documentTitle}"`}</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '580px', margin: '30px auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: primaryColor, padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>Signature Reminder</Heading>
          </Section>
          <Section style={{ padding: '32px 28px' }}>
            <Heading as="h3" style={{ color: '#0f172a', margin: '0 0 16px' }}>Signature Pending</Heading>
            <Text style={{ fontSize: '15px', color: '#334155', lineHeight: '24px' }}>
              Hello {recipientName}, this is a friendly reminder that <strong>{senderName}</strong> is awaiting your electronic signature on <strong>"{documentTitle}"</strong>.
            </Text>
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button style={{ backgroundColor: primaryColor, color: '#ffffff', padding: '14px 28px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }} href={signingUrl}>
                Sign Document Now
              </Button>
            </Section>
            <Text style={{ fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
              This link will expire on <strong>{expiresAtFormatted}</strong>.
            </Text>
            <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
            <Text style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
              Lunar Sign — Compliant with SA ECTA 25 of 2002
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default ReminderEmail;
