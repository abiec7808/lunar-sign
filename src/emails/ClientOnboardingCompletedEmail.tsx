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

export interface ClientOnboardingCompletedEmailProps {
  businessName: string;
  clientName: string;
  companyName: string;
  email: string;
  phone?: string | null;
  registrationNumber?: string | null;
  submittedAtFormatted: string;
  viewUrl: string;
  isClientReceipt?: boolean;
}

export function ClientOnboardingCompletedEmail({
  businessName = 'LunarPOS George',
  clientName = 'John Doe',
  companyName = 'Acme Trading Pty Ltd',
  email = 'john@acme.co.za',
  phone = '+27 82 123 4567',
  registrationNumber = '2025/998877/07',
  submittedAtFormatted = '16 Oct 2026, 19:50 SAST',
  viewUrl = 'https://lunar-sign.netlify.app/onboard/sample-token',
  isClientReceipt = false,
}: ClientOnboardingCompletedEmailProps) {
  const subjectText = isClientReceipt
    ? `Onboarding Confirmation: ${businessName}`
    : `🎉 New Client Onboarded: ${companyName} (${clientName})`;

  return (
    <Html>
      <Head />
      <Preview>{subjectText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>{businessName}</Heading>
            <Text style={headerSubtitle}>Client Onboarding Portal</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              {isClientReceipt ? 'Your Onboarding is Complete!' : 'New Client Successfully Onboarded!'}
            </Heading>

            <Text style={paragraph}>
              {isClientReceipt ? (
                <>
                  Thank you for submitting your client onboarding details and electronic signature to <strong>{businessName}</strong>. Your account details have been recorded and your electronic signature timestamped under SA ECTA 25 of 2002.
                </>
              ) : (
                <>
                  A new client has completed and digitally signed their onboarding form. Their details have been automatically added to your <strong>Client List & Address Book</strong>:
                </>
              )}
            </Text>

            <Section style={infoCard}>
              <Text style={infoRow}>
                <strong>Company Name:</strong> {companyName}
              </Text>
              <Text style={infoRow}>
                <strong>Authorized Signer:</strong> {clientName}
              </Text>
              <Text style={infoRow}>
                <strong>Email Address:</strong> {email}
              </Text>
              {phone && (
                <Text style={infoRow}>
                  <strong>Contact Number:</strong> {phone}
                </Text>
              )}
              {registrationNumber && (
                <Text style={infoRow}>
                  <strong>Reg Number:</strong> {registrationNumber}
                </Text>
              )}
              <Text style={infoRow}>
                <strong>Signed & Submitted:</strong> {submittedAtFormatted}
              </Text>
              <Text style={infoRow}>
                <strong>Status:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Completed & E-Signed</span>
              </Text>
            </Section>

            <Section style={btnContainer}>
              <Button style={button} href={viewUrl}>
                {isClientReceipt ? 'View Your Completed Form →' : 'View Onboarding & Client Record →'}
              </Button>
            </Section>

            <Hr style={divider} />
            <Text style={footer}>
              Secured by Lunar Sign • Valid electronic signature under South African Law (ECTA 25 of 2002)
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#090d16',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '24px 16px 48px',
  maxWidth: '560px',
};

const header = {
  padding: '28px 24px',
  backgroundColor: '#0f172a',
  borderRadius: '12px 12px 0 0',
  textAlign: 'center' as const,
  borderBottom: '1px solid #1e293b',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '800',
  margin: '0',
  letterSpacing: '-0.5px',
};

const headerSubtitle = {
  color: '#10b981',
  fontSize: '12px',
  margin: '4px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const content = {
  padding: '32px 24px',
  backgroundColor: '#0b1120',
  borderRadius: '0 0 12px 12px',
  border: '1px solid #1e293b',
  borderTop: 'none',
};

const heading = {
  color: '#f8fafc',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#94a3b8',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 18px',
};

const infoCard = {
  backgroundColor: '#111c35',
  border: '1px solid #1e3a5f',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '0 0 24px',
};

const infoRow = {
  color: '#cbd5e1',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '4px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const button = {
  backgroundColor: '#059669',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '13px 32px',
};

const divider = {
  borderColor: '#1e293b',
  margin: '24px 0 16px',
};

const footer = {
  color: '#64748b',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '0',
};

export default ClientOnboardingCompletedEmail;
