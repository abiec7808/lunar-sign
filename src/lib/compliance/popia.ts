/**
 * Protection of Personal Information Act 4 of 2013 ("POPIA")
 * Privacy Notice, Signer Consent, Subject Access Requests, and Data Retention
 */

export const POPIA_PRIVACY_NOTICE = {
  title: 'POPIA Privacy & Data Processing Statement',
  responsibleParty: 'Computer Home Services / LunarPOS George (or the Sending Organisation)',
  purposes: [
    'Verifying the identity of the signatory in accordance with ECTA 25 of 2002.',
    'Creating an immutable, tamper-evident cryptographic audit trail.',
    'Distributing executed contractual agreements to participating parties.',
    'Preventing fraud, unauthorized alterations, and repudiation of signatures.',
  ],
  collectedInformation: [
    { field: 'Full Name & Email Address', purpose: 'Identification, communication, and electronic delivery' },
    { field: 'IP Address & Network Metadata', purpose: 'Audit trail verification, origin validation, and fraud prevention' },
    { field: 'Device & Browser User-Agent', purpose: 'Cryptographic signature certificate audit logs' },
    { field: 'Approximate Geolocation (Country / City)', purpose: 'Audit certificate jurisdiction logging' },
    { field: 'Electronic Signature / Handwritten Image', purpose: 'Binding agreement execution' },
  ],
  dataResidency: 'Primary data storage and cryptographic signing services are hosted securely. Cross-border transfers adhere to Section 72 of POPIA (adequate level of protection / binding contractual provisions).',
  dataSubjectRights: 'Under Chapter 3 of POPIA, data subjects possess the right to request access to their personal information, request correction or deletion, and object to processing where applicable.',
};

export const POPIA_SIGNER_CONSENT_STATEMENT = `I acknowledge and agree that my personal information (including full name, email, IP address, device telemetry, and electronic signature) will be processed, cryptographically hashed, and recorded in the audit trail for document verification and legal compliance under POPIA and ECTA.`;

export interface PopiaSubjectDataExport {
  exportedAt: string;
  recipientEmail: string;
  recordsCount: number;
  documents: Array<{
    documentId: string;
    title: string;
    role: string;
    status: string;
    openedAt?: string | null;
    signedAt?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }>;
  signatures: Array<{
    signatureId: string;
    method: string;
    createdAt: string;
  }>;
  auditEvents: Array<{
    eventId: string;
    eventType: string;
    description: string;
    timestamp: string;
  }>;
}
