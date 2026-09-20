import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DocumentField, SignatureRecord, Recipient } from '@/types';
import { sha256Hex } from '@/lib/security/crypto';
import { formatSaDate, formatSaDateTime } from '@/lib/dates';

export interface StampOptions {
  pdfBuffer: Buffer;
  fields: DocumentField[];
  signatures: SignatureRecord[];
  recipients?: Recipient[];
}

export interface StampResult {
  finalPdfBuffer: Buffer;
  finalHash: string;
}

/**
 * Creates a server-side default 2-page standard legal PDF document using pdf-lib
 */
export async function createServerSamplePdf(): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const width = 595.28;
  const height = 841.89;

  // Page 1
  const page1 = pdfDoc.addPage([width, height]);
  page1.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: rgb(0.06, 0.09, 0.16),
  });

  page1.drawText('STANDARD SERVICE LEVEL AGREEMENT (SLA)', {
    x: 40,
    y: height - 42,
    size: 15,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Republic of South Africa • ECTA 25 of 2002 & POPIA 4 of 2013 Compliant', {
    x: 40,
    y: height - 60,
    size: 8.5,
    font: helvetica,
    color: rgb(0.65, 0.75, 0.9),
  });

  let y = height - 100;
  page1.drawText('1. PARTIES TO THE AGREEMENT', { x: 40, y, size: 10, font: helveticaBold, color: rgb(0.15, 0.2, 0.3) });
  y -= 14;
  page1.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.8, color: rgb(0.85, 0.88, 0.92) });
  y -= 18;

  page1.drawText('Client Full Legal Name: ____________________________________________________', { x: 40, y, size: 9, font: helvetica, color: rgb(0.3, 0.35, 0.4) });
  y -= 22;
  page1.drawText('13-Digit South African ID: ______________________  SARS VAT No: __________________', { x: 40, y, size: 9, font: helvetica, color: rgb(0.3, 0.35, 0.4) });
  y -= 30;

  page1.drawText('2. TERMS AND CONDITIONS OF ENGAGEMENT', { x: 40, y, size: 10, font: helveticaBold, color: rgb(0.15, 0.2, 0.3) });
  y -= 14;
  page1.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 0.8, color: rgb(0.85, 0.88, 0.92) });
  y -= 18;

  const clauses = [
    '2.1 Scope of Work: The Service Provider agrees to deliver professional software and digital infrastructure services.',
    '2.2 Monthly Retainer / Service Fee: ZAR ____________________ payable monthly in advance on or before the 1st day.',
    '2.3 South African Electronic Communications and Transactions Act (ECTA 25 of 2002): The parties agree that electronic',
    '    signatures executed on this platform are legally valid and binding in accordance with Section 13 of ECTA.',
    '2.4 Protection of Personal Information Act (POPIA 4 of 2013): All signatory data and records are processed securely',
    '    with end-to-end encryption and will not be disclosed to unauthorized third parties.',
    '2.5 Governing Law: This contract shall be governed by and construed in accordance with the laws of South Africa.',
  ];

  for (const line of clauses) {
    page1.drawText(line, { x: 40, y, size: 8.5, font: helvetica, color: rgb(0.2, 0.25, 0.3) });
    y -= 16;
  }

  page1.drawText('Page 1 of 2', { x: width - 90, y: 30, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.6) });

  // Page 2
  const page2 = pdfDoc.addPage([width, height]);
  page2.drawRectangle({
    x: 0,
    y: height - 50,
    width,
    height: 50,
    color: rgb(0.06, 0.09, 0.16),
  });

  page2.drawText('STANDARD SERVICE LEVEL AGREEMENT (SLA) — SIGNATURE EXECUTION', {
    x: 40,
    y: height - 32,
    size: 11,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page2.drawText('Page 2 of 2', { x: width - 90, y: 30, size: 8, font: helvetica, color: rgb(0.5, 0.55, 0.6) });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * Stamp all field values and signatures onto the PDF document
 */
export async function stampAndFlattenPdf(options: StampOptions): Promise<StampResult> {
  const { pdfBuffer, fields, signatures, recipients = [] } = options;
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Map signatures by field_id for quick lookup
  const signatureMap = new Map<string, SignatureRecord>();
  signatures.forEach((s) => signatureMap.set(s.field_id, s));

  const totalPages = pdfDoc.getPageCount();

  for (const field of fields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) continue;

    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const fieldX = (field.x_pct / 100) * pageWidth;
    const fieldW = (field.width_pct / 100) * pageWidth;
    const fieldH = (field.height_pct / 100) * pageHeight;
    const fieldY = pageHeight - (field.y_pct / 100) * pageHeight - fieldH;

    // Custom or dynamic font size
    const customFontSize = (field.validation_rule as any)?.fontSize || (field.value_meta as any)?.fontSize;
    const calculatedFontSize = customFontSize ? Number(customFontSize) : Math.max(8, Math.min(18, Math.round(fieldH * 0.62)));

    // 1. Signature / Initials fields
    if (field.type === 'signature' || field.type === 'initials') {
      const sig = signatureMap.get(field.id);
      if (sig && sig.signature_data) {
        try {
          if (sig.method === 'drawn' || sig.method === 'uploaded') {
            const base64Data = sig.signature_data.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            const embeddedImg = await pdfDoc.embedPng(imgBuffer);

            page.drawImage(embeddedImg, {
              x: fieldX,
              y: fieldY,
              width: fieldW,
              height: fieldH,
            });
          } else if (sig.method === 'typed') {
            page.drawText(sig.signature_data, {
              x: fieldX + 4,
              y: fieldY + fieldH * 0.25,
              size: calculatedFontSize * 1.2,
              font: helveticaBold,
              color: rgb(0.05, 0.15, 0.35),
            });
          }
        } catch (err) {
          console.error(`Error embedding signature for field ${field.id}:`, err);
        }
      }
      continue;
    }

    // 2. Date Signed
    if (field.type === 'date_signed' || field.type === 'date_picker') {
      const val = field.value || (field.completed_at ? formatSaDate(field.completed_at) : formatSaDate(new Date()));
      page.drawText(val, {
        x: fieldX + 4,
        y: fieldY + (fieldH - calculatedFontSize) / 2 + 1,
        size: calculatedFontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0), // Pure Black Font
      });
      continue;
    }

    // 3. Checkbox
    if (field.type === 'checkbox') {
      if (field.value === 'true' || field.value === '1' || field.value === 'checked') {
        page.drawText('✓', {
          x: fieldX + fieldW * 0.2,
          y: fieldY + fieldH * 0.15,
          size: Math.max(10, fieldH * 0.8),
          font: helveticaBold,
          color: rgb(0.1, 0.4, 0.8),
        });
      }
      continue;
    }

    // 4. Standard Text / Number / Currency / SA ID / SA VAT / Dropdown
    if (field.value) {
      page.drawText(String(field.value), {
        x: fieldX + 4,
        y: fieldY + (fieldH - calculatedFontSize) / 2 + 1,
        size: calculatedFontSize,
        font: helveticaFont,
        color: rgb(0, 0, 0), // Pure Black Font
        maxWidth: fieldW - 8,
      });
    }
  }

  // Draw Digital Signature & Legal Acceptance Box Section for up to 4 signatories
  if (recipients.length > 0 || signatures.length > 0) {
    try {
      await drawDigitalSignatureApprovalSection(pdfDoc, recipients, signatures, helveticaFont, helveticaBold, helveticaOblique);
    } catch (err) {
      console.error('Error drawing digital signature approval section:', err);
    }
  }

  const finalPdfBytes = await pdfDoc.save();
  const finalPdfBuffer = Buffer.from(finalPdfBytes);
  const finalHash = sha256Hex(finalPdfBuffer);

  return {
    finalPdfBuffer,
    finalHash,
  };
}

/**
 * Draws structured Digital Signature Approval Boxes for up to 4 company members / clients
 */
async function drawDigitalSignatureApprovalSection(
  pdfDoc: PDFDocument,
  recipients: Recipient[],
  signatures: SignatureRecord[],
  fontRegular: any,
  fontBold: any,
  fontOblique: any
) {
  const width = 595.28;
  const height = 841.89;

  // Add dedicated Execution & Approval Page
  const execPage = pdfDoc.addPage([width, height]);
  
  // Header Banner
  execPage.drawRectangle({
    x: 30,
    y: height - 60,
    width: width - 60,
    height: 40,
    color: rgb(0.06, 0.09, 0.16),
  });

  execPage.drawText('DIGITAL SIGNATURE & LEGAL ACCEPTANCE SECTION', {
    x: 45,
    y: height - 42,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  execPage.drawText('Executed under Section 13 of the South African Electronic Communications and Transactions Act (ECTA 25 of 2002)', {
    x: 45,
    y: height - 54,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.65, 0.75, 0.9),
  });

  // Display up to 4 Signatories in a 2x2 grid
  const signersToDisplay = recipients.slice(0, 4);
  const boxWidth = (width - 70) / 2; // ~262pt each
  const boxHeight = 160;

  for (let i = 0; i < signersToDisplay.length; i++) {
    const r = signersToDisplay[i];
    const col = i % 2; // 0 = left, 1 = right
    const row = Math.floor(i / 2); // 0 = top, 1 = bottom

    const boxX = 30 + col * (boxWidth + 10);
    const boxY = height - 80 - (row + 1) * (boxHeight + 15);

    const isBusiness = i % 2 === 0 || r.role === 'approver';
    const partyLabel = isBusiness ? 'BUSINESS SIGNATORY / MEMBER' : 'CLIENT SIGNATORY / MEMBER';

    // Outer Box
    execPage.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.98, 0.99, 1.0),
      borderColor: rgb(0.8, 0.85, 0.92),
      borderWidth: 1.2,
    });

    // Box Header
    execPage.drawRectangle({
      x: boxX,
      y: boxY + boxHeight - 22,
      width: boxWidth,
      height: 22,
      color: rgb(0.92, 0.94, 0.98),
      borderColor: rgb(0.8, 0.85, 0.92),
      borderWidth: 0.8,
    });

    execPage.drawText(`MEMBER / SIGNATORY #${i + 1} — ${partyLabel}`, {
      x: boxX + 8,
      y: boxY + boxHeight - 15,
      size: 7.5,
      font: fontBold,
      color: rgb(0.15, 0.25, 0.45),
    });

    // Signature Area
    const sigRecord = signatures.find((s) => s.recipient_id === r.id) || signatures[i];
    if (sigRecord && sigRecord.signature_data) {
      try {
        if (sigRecord.method === 'drawn' || sigRecord.method === 'uploaded') {
          const base64Data = sigRecord.signature_data.replace(/^data:image\/\w+;base64,/, '');
          const imgBuffer = Buffer.from(base64Data, 'base64');
          const embeddedImg = await pdfDoc.embedPng(imgBuffer);
          execPage.drawImage(embeddedImg, {
            x: boxX + 15,
            y: boxY + boxHeight - 75,
            width: 140,
            height: 45,
          });
        } else {
          execPage.drawText(sigRecord.signature_data, {
            x: boxX + 15,
            y: boxY + boxHeight - 60,
            size: 14,
            font: fontBold,
            color: rgb(0.08, 0.18, 0.38),
          });
        }
      } catch (err) {
        execPage.drawText('[Signed Electronically]', { x: boxX + 15, y: boxY + boxHeight - 60, size: 10, font: fontBold, color: rgb(0.1, 0.4, 0.2) });
      }
    } else {
      execPage.drawText(r.status === 'signed' ? '✓ Digitally Signed' : '⏳ Awaiting Signature', {
        x: boxX + 15,
        y: boxY + boxHeight - 60,
        size: 11,
        font: fontBold,
        color: r.status === 'signed' ? rgb(0.1, 0.5, 0.2) : rgb(0.6, 0.4, 0.1),
      });
    }

    // Name & Details
    execPage.drawText(`Full Name: ${r.name}`, { x: boxX + 8, y: boxY + 68, size: 8, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
    execPage.drawText(`Email: ${r.email}`, { x: boxX + 8, y: boxY + 56, size: 7.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
    if (r.phone) {
      execPage.drawText(`Mobile: ${r.phone}`, { x: boxX + 8, y: boxY + 45, size: 7.5, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
    }

    // Official ECTA Digital Signature Statement
    const statement = 'Legal Notice: The signatory confirms and approves this agreement in full. This digital signature is valid and binding under Section 13 of the South African ECTA Act 25 of 2002.';
    execPage.drawText(statement, {
      x: boxX + 8,
      y: boxY + 32,
      size: 6.2,
      font: fontOblique,
      color: rgb(0.35, 0.4, 0.45),
      maxWidth: boxWidth - 16,
      lineHeight: 7.5,
    });

    // Date & Hash
    const dateStr = r.signed_at ? formatSaDateTime(r.signed_at) : formatSaDateTime(new Date());
    execPage.drawText(`Signed Date (SAST): ${dateStr}`, { x: boxX + 8, y: boxY + 8, size: 6.8, font: fontBold, color: rgb(0.1, 0.45, 0.2) });
  }

  // Footer Disclaimer
  execPage.drawText('Lunar Sign E-Signature System • RSA Legal Electronic Evidence Integrity Sealed with SHA-256', {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.6),
  });
}
