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

export interface SignedConfirmationEmailProps {
  recipientName: string;
  documentTitle: string;
  signedAtFormatted: string;
  primaryColor?: string;
}

export function SignedConfirmationEmail({
  recipientName = 'Signer',
  documentTitle = 'Service Agreement',
  signedAtFormatted = '19 September 2026, 14:30 SAST',
  primaryColor = '#4f46e5',
}: SignedConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You have signed "${documentTitle}"`}</Preview>
      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '580px', margin: '30px auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
          <Section style={{ backgroundColor: primaryColor, padding: '24px', textAlign: 'center' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>Signature Confirmed</Heading>
          </Section>
          <Section style={{ padding: '32px 28px' }}>
            <Heading as="h3" style={{ color: '#0f172a', margin: '0 0 16px' }}>Thank you, {recipientName}!</Heading>
            <Text style={{ fontSize: '15px', color: '#334155', lineHeight: '24px' }}>
              Your electronic signature on <strong>"{documentTitle}"</strong> was successfully affixed and recorded on <strong>{signedAtFormatted}</strong>.
            </Text>
            <Text style={{ fontSize: '14px', color: '#64748b', lineHeight: '22px' }}>
              Once all other required signatories have completed their signatures, you will automatically receive an email with the fully executed document and the official ECTA Signature Certificate.
            </Text>
            <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
            <Text style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Lunar Sign — South African Electronic Transactions Compliance
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default SignedConfirmationEmail;
