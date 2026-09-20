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

export interface NewRegistrationAlertEmailProps {
  businessName: string;
  adminFullName: string;
  adminEmail: string;
  phone?: string | null;
  vatNumber?: string | null;
  companyRegNumber?: string | null;
  address?: string | null;
  approvalUrl: string;
}

export function NewRegistrationAlertEmail({
  businessName = 'New Business Pty Ltd',
  adminFullName = 'Business Owner',
  adminEmail = 'owner@example.co.za',
  phone = '+27 82 000 0000',
  vatNumber = '4123456789',
  companyRegNumber = '2026/123456/07',
  address = 'George, Western Cape, South Africa',
  approvalUrl = 'https://lunar-sign.netlify.app/businesses',
}: NewRegistrationAlertEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New Business Registration: ${businessName} (Awaiting Super Admin Approval)`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Lunar Sign</Heading>
            <Text style={headerSubtitle}>Super Admin Notification System</Text>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              New Business Registered
            </Heading>
            <Text style={paragraph}>
              A new company has registered on <strong>Lunar Sign</strong> and is currently <em>pending Super Admin approval</em>:
            </Text>

            <Section style={infoCard}>
              <Text style={infoRow}>
                <strong>Company Name:</strong> {businessName}
              </Text>
              <Text style={infoRow}>
                <strong>Primary Admin:</strong> {adminFullName}
              </Text>
              <Text style={infoRow}>
                <strong>Admin Email:</strong> {adminEmail}
              </Text>
              {phone && (
                <Text style={infoRow}>
                  <strong>Phone / Mobile:</strong> {phone}
                </Text>
              )}
              {companyRegNumber && (
                <Text style={infoRow}>
                  <strong>Company Reg No:</strong> {companyRegNumber}
                </Text>
              )}
              {vatNumber && (
                <Text style={infoRow}>
                  <strong>SARS VAT No:</strong> {vatNumber}
                </Text>
              )}
              {address && (
                <Text style={infoRow}>
                  <strong>Physical Address:</strong> {address}
                </Text>
              )}
              <Text style={infoRow}>
                <strong>Tier Allocation:</strong> 5 Users | 10 Documents (Standard Tenant Limit)
              </Text>
            </Section>

            <Section style={btnContainer}>
              <Button style={button} href={approvalUrl}>
                Review & Approve in Admin Panel
              </Button>
            </Section>

            <Text style={smallText}>
              Alternatively, log in directly at <a href={approvalUrl} style={{ color: '#4f46e5' }}>{approvalUrl}</a> to approve, modify limits, or manage this account.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Lunar Sign Platform • Automated Super Admin Alert • {new Date().toLocaleDateString('en-ZA')}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#090d16',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '24px 0',
};

const container = {
  backgroundColor: '#0f172a',
  margin: '0 auto',
  maxWidth: '580px',
  borderRadius: '12px',
  overflow: 'hidden',
  border: '1px solid #1e293b',
};

const header = {
  backgroundColor: '#4f46e5',
  padding: '24px',
  textAlign: 'center' as const,
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '800',
  margin: '0',
  letterSpacing: '-0.5px',
};

const headerSubtitle = {
  color: '#e0e7ff',
  fontSize: '12px',
  margin: '4px 0 0',
  fontWeight: '500',
};

const content = {
  padding: '32px 28px',
};

const heading = {
  color: '#f8fafc',
  fontSize: '18px',
  fontWeight: '700',
  margin: '0 0 16px',
};

const paragraph = {
  color: '#cbd5e1',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
};

const infoCard = {
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
  borderLeft: '4px solid #4f46e5',
};

const infoRow = {
  color: '#e2e8f0',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '6px 0',
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
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
};

const smallText = {
  color: '#94a3b8',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '16px 0 0',
};

const hr = {
  borderColor: '#334155',
  margin: '28px 0 20px',
};

const footer = {
  color: '#64748b',
  fontSize: '11px',
  textAlign: 'center' as const,
  margin: '0',
};
