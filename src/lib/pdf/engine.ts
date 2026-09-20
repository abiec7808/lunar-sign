import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { DocumentField, SignatureRecord } from '@/types';
import { sha256Hex } from '@/lib/security/crypto';
import { formatSaDate } from '@/lib/dates';

export interface StampOptions {
  pdfBuffer: Buffer;
  fields: DocumentField[];
  signatures: SignatureRecord[];
}

export interface StampResult {
  finalPdfBuffer: Buffer;
  finalHash: string;
}

/**
 * Stamp all field values and signatures onto the PDF document
 * Coordinates are percentage-based (0 to 100).
 * Note: PDF coordinates origin (0,0) is bottom-left, whereas web UI is top-left.
 */
export async function stampAndFlattenPdf(options: StampOptions): Promise<StampResult> {
  const { pdfBuffer, fields, signatures } = options;
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Map signatures by field_id for quick lookup
  const signatureMap = new Map<string, SignatureRecord>();
  signatures.forEach((s) => signatureMap.set(s.field_id, s));

  const totalPages = pdfDoc.getPageCount();

  for (const field of fields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) continue;

    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Coordinate conversion:
    // Web x_pct: distance from left (0 to 100) -> PDF x = (x_pct / 100) * pageWidth
    // Web y_pct: distance from top (0 to 100)  -> PDF y = pageHeight - ((y_pct + height_pct) / 100) * pageHeight
    const fieldX = (field.x_pct / 100) * pageWidth;
    const fieldW = (field.width_pct / 100) * pageWidth;
    const fieldH = (field.height_pct / 100) * pageHeight;
    const fieldY = pageHeight - (field.y_pct / 100) * pageHeight - fieldH;

    // 1. Signature / Initials fields
    if (field.type === 'signature' || field.type === 'initials') {
      const sig = signatureMap.get(field.id);
      if (sig && sig.signature_data) {
        try {
          if (sig.method === 'drawn' || sig.method === 'uploaded') {
            // Extract base64 image PNG data
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
            // Render typed signature with decorative styling
            page.drawText(sig.signature_data, {
              x: fieldX + 4,
              y: fieldY + fieldH * 0.3,
              size: Math.max(12, Math.min(22, fieldH * 0.7)),
              font: helveticaBold,
              color: rgb(0.08, 0.18, 0.36), // Deep blue signature ink
            });
          }
        } catch (err) {
          console.error(`Error embedding signature for field ${field.id}:`, err);
        }
      }
      continue;
    }

    // 2. Date Signed
    if (field.type === 'date_signed') {
      const val = field.value || (field.completed_at ? formatSaDate(field.completed_at) : formatSaDate(new Date()));
      page.drawText(val, {
        x: fieldX + 4,
        y: fieldY + fieldH * 0.25,
        size: Math.max(9, Math.min(13, fieldH * 0.6)),
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      continue;
    }

    // 3. Checkbox
    if (field.type === 'checkbox') {
      if (field.value === 'true' || field.value === '1' || field.value === 'checked') {
        // Draw a clean checkmark
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
      const fontSize = Math.max(8, Math.min(11, fieldH * 0.65));
      page.drawText(String(field.value), {
        x: fieldX + 4,
        y: fieldY + (fieldH - fontSize) / 2 + 1,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: fieldW - 8,
      });
    }
  }

  // Save and flatten the document
  const finalPdfBytes = await pdfDoc.save();
  const finalPdfBuffer = Buffer.from(finalPdfBytes);
  const finalHash = sha256Hex(finalPdfBuffer);

  return {
    finalPdfBuffer,
    finalHash,
  };
}
