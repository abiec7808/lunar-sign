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

export interface ClientOnboardingInviteEmailProps {
  businessName: string;
  clientName?: string;
  onboardingUrl: string;
  customMessage?: string;
}

export function ClientOnboardingInviteEmail({
  businessName = 'LunarPOS George',
  clientName = 'Valued Client',
  onboardingUrl = 'https://lunar-sign.netlify.app/onboard/sample-token',
  customMessage,
}: ClientOnboardingInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${businessName} has invited you to complete client onboarding`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>{businessName}</Heading>
            <Text style={headerSubtitle}>Official Client Onboarding Portal</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Welcome, {clientName || 'Partner'}
            </Heading>
            
            <Text style={paragraph}>
              <strong>{businessName}</strong> has invited you to complete your client onboarding questionnaire and official registration details.
            </Text>

            {customMessage && (
              <Section style={messageCard}>
                <Text style={messageLabel}>Personal Note from {businessName}:</Text>
                <Text style={messageText}>{customMessage}</Text>
              </Section>
            )}

            <Text style={paragraph}>
              Please click the link below to provide your business information, answer a brief setup questionnaire, and provide your electronic signature under South African ECTA Act 25 of 2002.
            </Text>

            <Section style={btnContainer}>
              <Button style={button} href={onboardingUrl}>
                Complete Onboarding Form →
              </Button>
            </Section>

            <Section style={linkBox}>
              <Text style={linkBoxLabel}>Direct link if button does not open:</Text>
              <Text style={linkBoxUrl}>{onboardingUrl}</Text>
            </Section>

            <Hr style={divider} />
            <Text style={footer}>
              Secured by Lunar Sign • SA ECTA Act 25 of 2002 Compliant E-Signatures
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
  color: '#38bdf8',
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

const messageCard = {
  backgroundColor: '#111c35',
  border: '1px solid #1e3a5f',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 20px',
};

const messageLabel = {
  color: '#38bdf8',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
};

const messageText = {
  color: '#e2e8f0',
  fontSize: '13px',
  fontStyle: 'italic',
  lineHeight: '20px',
  margin: '0',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '13px 32px',
};

const linkBox = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  padding: '12px 14px',
  margin: '20px 0 0',
  border: '1px solid #1e293b',
};

const linkBoxLabel = {
  color: '#64748b',
  fontSize: '11px',
  margin: '0 0 4px',
};

const linkBoxUrl = {
  color: '#38bdf8',
  fontSize: '11px',
  wordBreak: 'break-all' as const,
  margin: '0',
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

export default ClientOnboardingInviteEmail;
