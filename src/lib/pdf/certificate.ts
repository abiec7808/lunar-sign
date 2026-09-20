import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { Document, Recipient, AuditEvent, SignatureRecord } from '@/types';
import { formatSaDateTime, formatAuditTimestamps } from '@/lib/dates';
import { getEctaLegalNotice } from '@/lib/compliance/ecta';
import { sha256Hex } from '@/lib/security/crypto';

export interface CertificateOptions {
  document: Document;
  recipients: Recipient[];
  auditEvents: AuditEvent[];
  signatures?: SignatureRecord[];
  baseUrl?: string;
}

export async function generateSignatureCertificate(options: CertificateOptions): Promise<Buffer> {
  const { document, recipients, auditEvents, signatures = [], baseUrl = 'https://lunar-sign.netlify.app' } = options;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Standard A4: 595.28 x 841.89
  const width = 595.28;
  const height = 841.89;

  let page = pdfDoc.addPage([width, height]);
  let y = height - 40;

  // Header Bar
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: rgb(0.06, 0.09, 0.16), // Dark Slate
  });

  page.drawText('CERTIFICATE OF ELECTRONIC COMPLETION', {
    x: 40,
    y: height - 45,
    size: 16,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('South African ECTA 25 of 2002 & POPIA 4 of 2013 Compliant Audit Trail', {
    x: 40,
    y: height - 65,
    size: 9,
    font: helvetica,
    color: rgb(0.6, 0.7, 0.85),
  });

  // Verification QR Code
  const verifyUrl = `${baseUrl}/verify/${document.id}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 70 });
    const qrPng = await pdfDoc.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
    page.drawImage(qrPng, {
      x: width - 90,
      y: height - 75,
      width: 60,
      height: 60,
    });
  } catch (err) {
    console.error('Failed to draw QR code on certificate:', err);
  }

  y = height - 105;

  // Section: Document Summary
  page.drawText('DOCUMENT SUMMARY', { x: 40, y, size: 11, font: helveticaBold, color: rgb(0.2, 0.3, 0.6) });
  y -= 15;

  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
  y -= 16;

  const docDetails = [
    { label: 'Document Title:', value: document.title },
    { label: 'Document ID (UUID):', value: document.id },
    { label: 'Original Filename:', value: document.original_filename },
    { label: 'Total Pages:', value: String(document.page_count) },
    { label: 'Original SHA-256 Hash:', value: document.original_hash || '—' },
    { label: 'Final Integrity SHA-256:', value: document.final_hash || '—' },
    { label: 'Completed Date (SAST):', value: formatSaDateTime(document.completed_at || document.updated_at) },
  ];

  for (const item of docDetails) {
    page.drawText(item.label, { x: 40, y, size: 9, font: helveticaBold, color: rgb(0.25, 0.3, 0.35) });
    page.drawText(item.value, { x: 180, y, size: 9, font: helvetica, color: rgb(0.1, 0.15, 0.2), maxWidth: 375 });
    y -= 14;
  }

  y -= 10;

  // Section: Signatory Details & Consent
  page.drawText('SIGNATORIES & RECIPIENTS', { x: 40, y, size: 11, font: helveticaBold, color: rgb(0.2, 0.3, 0.6) });
  y -= 15;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
  y -= 18;

  for (const r of recipients) {
    if (y < 120) {
      page = pdfDoc.addPage([width, height]);
      y = height - 50;
    }

    // Recipient card background
    page.drawRectangle({
      x: 40,
      y: y - 55,
      width: width - 80,
      height: 65,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.85, 0.88, 0.95),
      borderWidth: 1,
    });

    page.drawText(`${r.name} (${r.email})`, { x: 50, y: y - 2, size: 10, font: helveticaBold, color: rgb(0.1, 0.15, 0.25) });
    page.drawText(`Role: ${r.role.toUpperCase()} | Status: ${r.status.toUpperCase()} | Auth: ${r.auth_method}`, {
      x: 50,
      y: y - 16,
      size: 8.5,
      font: helvetica,
      color: rgb(0.3, 0.4, 0.5),
    });

    const consentText = r.consent_given_at
      ? `ECTA Consent Given: ${formatSaDateTime(r.consent_given_at)} | IP: ${r.ip_address || '—'}`
      : 'Consent Pending';
    page.drawText(consentText, { x: 50, y: y - 30, size: 8, font: helvetica, color: rgb(0.2, 0.5, 0.3) });

    const clientInfo = `Client: ${r.user_agent ? r.user_agent.substring(0, 75) + '...' : '—'}`;
    page.drawText(clientInfo, { x: 50, y: y - 44, size: 7.5, font: helveticaOblique, color: rgb(0.5, 0.55, 0.6) });

    y -= 75;
  }

  // Section: Chronological Audit Trail
  if (y < 200) {
    page = pdfDoc.addPage([width, height]);
    y = height - 50;
  }

  y -= 10;
  page.drawText('CHRONOLOGICAL AUDIT TRAIL', { x: 40, y, size: 11, font: helveticaBold, color: rgb(0.2, 0.3, 0.6) });
  y -= 15;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });
  y -= 16;

  // Header row for audit table
  page.drawText('Timestamp (UTC / SAST)', { x: 40, y, size: 8.5, font: helveticaBold, color: rgb(0.3, 0.35, 0.4) });
  page.drawText('Actor / Event', { x: 220, y, size: 8.5, font: helveticaBold, color: rgb(0.3, 0.35, 0.4) });
  page.drawText('Details / Security Context', { x: 340, y, size: 8.5, font: helveticaBold, color: rgb(0.3, 0.35, 0.4) });
  y -= 12;

  const sortedEvents = [...auditEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const ev of sortedEvents) {
    if (y < 120) {
      page = pdfDoc.addPage([width, height]);
      y = height - 50;
    }

    const { sast } = formatAuditTimestamps(ev.created_at);
    page.drawText(sast, { x: 40, y, size: 8, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
    page.drawText(ev.event_type, { x: 220, y, size: 8, font: helveticaBold, color: rgb(0.15, 0.2, 0.3) });
    page.drawText(ev.description, { x: 340, y, size: 7.5, font: helvetica, color: rgb(0.3, 0.35, 0.4), maxWidth: 215 });

    y -= 16;
  }

  // Legal Notice Page / Footer
  if (y < 180) {
    page = pdfDoc.addPage([width, height]);
    y = height - 50;
  }

  y -= 15;
  page.drawRectangle({
    x: 40,
    y: y - 110,
    width: width - 80,
    height: 120,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  page.drawText('SOUTH AFRICAN ECTA 25 OF 2002 STATUTORY NOTICE', {
    x: 50,
    y: y - 5,
    size: 9,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.3),
  });

  const legalLines = [
    'The signatures affixed to this document are valid electronic signatures under Section 13(2) and 13(3) of ECTA 25 of 2002.',
    'In terms of Section 11 and Section 15 of ECTA, this data message is admissible in evidence and presumed correct in law.',
    'Document integrity is cryptographically protected by SHA-256 cryptographic hashing. Any post-signing tampering will',
    `alter this hash and can be publicly detected at ${verifyUrl}.`,
  ];

  let textY = y - 24;
  for (const line of legalLines) {
    page.drawText(line, { x: 50, y: textY, size: 7.5, font: helvetica, color: rgb(0.35, 0.4, 0.45) });
    textY -= 12;
  }

  const certBytes = await pdfDoc.save();
  return Buffer.from(certBytes);
}

/**
 * Appends the Signature Certificate pages directly to the final signed PDF
 */
export async function appendCertificateToPdf(signedPdfBuffer: Buffer, certificateBuffer: Buffer): Promise<Buffer> {
  const mainDoc = await PDFDocument.load(signedPdfBuffer, { ignoreEncryption: true });
  const certDoc = await PDFDocument.load(certificateBuffer, { ignoreEncryption: true });

  const copiedPages = await mainDoc.copyPages(certDoc, certDoc.getPageIndices());
  copiedPages.forEach((page) => mainDoc.addPage(page));

  const mergedBytes = await mainDoc.save();
  return Buffer.from(mergedBytes);
}
