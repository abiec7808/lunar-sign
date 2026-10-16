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

export interface ClientOnboardingRequestAlertEmailProps {
  businessName: string;
  adminFullName: string;
  adminEmail: string;
  phone?: string | null;
  approvalUrl: string;
}

export function ClientOnboardingRequestAlertEmail({
  businessName = 'Sample Business',
  adminFullName = 'Business Owner',
  adminEmail = 'owner@example.co.za',
  phone = '+27 82 000 0000',
  approvalUrl = 'https://lunar-sign.netlify.app/businesses',
}: ClientOnboardingRequestAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Client Onboarding Module Request: ${businessName}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Lunar Sign</Heading>
            <Text style={headerSubtitle}>Module Activation Request</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Client Onboarding Module Requested
            </Heading>
            <Text style={paragraph}>
              A business has requested activation of the <strong>Client Onboarding & Questionnaire Builder</strong> module on Lunar Sign:
            </Text>

            <Section style={infoCard}>
              <Text style={infoRow}>
                <strong>Company Name:</strong> {businessName}
              </Text>
              <Text style={infoRow}>
                <strong>Requested By:</strong> {adminFullName}
              </Text>
              <Text style={infoRow}>
                <strong>Admin Email:</strong> {adminEmail}
              </Text>
              {phone && (
                <Text style={infoRow}>
                  <strong>Contact Phone:</strong> {phone}
                </Text>
              )}
            </Section>

            <Text style={paragraph}>
              You can instantly approve and enable the Client Onboarding module for this business directly from the Super Admin panel:
            </Text>

            <Section style={btnContainer}>
              <Button style={button} href={approvalUrl}>
                Manage Businesses & Enable Module
              </Button>
            </Section>

            <Hr style={divider} />
            <Text style={footer}>
              Lunar Sign Platform • Automated Notification • George, Western Cape
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
  fontSize: '24px',
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
  backgroundColor: '#0284c7',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
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

export default ClientOnboardingRequestAlertEmail;
