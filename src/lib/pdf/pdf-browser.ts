'use client';

/**
 * Browser-side PDF Page Renderer using pdf.js
 * Converts PDF pages into high-resolution images/dataURLs for crisp canvas rendering in the editor.
 */

export interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
}

// Load pdf.js dynamically via browser script to prevent bundling node 'canvas' module issues
let pdfjsPromise: Promise<any> | null = null;

function loadPdfJsScript(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'));
  }

  if ((window as any).pdfjsLib) {
    return Promise.resolve((window as any).pdfjsLib);
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      } else {
        reject(new Error('pdfjsLib not found on window'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load pdf.js CDN script'));
    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

export async function renderPdfPagesFromBuffer(pdfBuffer: ArrayBuffer): Promise<RenderedPage[]> {
  const pdfjsLib = await loadPdfJsScript();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const renderedPages: RenderedPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    
    // Scale for high DPI / Retina displays (scale 2.0 provides crisp text)
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      const dataUrl = canvas.toDataURL('image/png', 0.95);

      renderedPages.push({
        pageNumber: pageNum,
        dataUrl,
        width: viewport.width,
        height: viewport.height,
        aspectRatio: viewport.width / viewport.height,
      });
    }
  }

  return renderedPages;
}

/**
 * Generate a realistic South African Service Agreement PDF in browser using pdf-lib
 * used as default starting contract or when creating from scratch.
 */
export async function createDefaultSamplePdf(): Promise<{ buffer: ArrayBuffer; base64: string }> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Master Service Agreement & Terms
  const page1 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p1W, height: p1H } = page1.getSize();

  // Header Banner
  page1.drawRectangle({
    x: 0,
    y: p1H - 70,
    width: p1W,
    height: 70,
    color: rgb(0.06, 0.09, 0.16),
  });

  page1.drawText('MASTER SERVICES AGREEMENT (SLA)', {
    x: 40,
    y: p1H - 40,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Republic of South Africa • Governed by ECTA 25 of 2002 & POPIA 4 of 2013', {
    x: 40,
    y: p1H - 58,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.7, 0.9),
  });

  // Section 1: Parties
  page1.drawText('1. PARTIES TO THE AGREEMENT', { x: 40, y: p1H - 100, size: 12, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page1.drawLine({ start: { x: 40, y: p1H - 106 }, end: { x: p1W - 40, y: p1H - 106 }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });

  page1.drawText('1.1 SERVICE PROVIDER: Computer Home Services t/a LunarPOS George (Registration: 2010/012345/07)', {
    x: 40,
    y: p1H - 125,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });

  page1.drawText('1.2 CLIENT (FULL LEGAL ENTITY OR INDIVIDUAL):', {
    x: 40,
    y: p1H - 145,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.3),
  });

  // Placeholders Guide box on page 1
  page1.drawRectangle({
    x: 40,
    y: p1H - 250,
    width: p1W - 80,
    height: 90,
    color: rgb(0.97, 0.98, 1.0),
    borderColor: rgb(0.85, 0.88, 0.95),
    borderWidth: 1,
  });

  page1.drawText('Client Full Name: _________________________________', { x: 50, y: p1H - 180, size: 10, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
  page1.drawText('South African 13-Digit ID: _________________________', { x: 50, y: p1H - 205, size: 10, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });
  page1.drawText('SARS VAT Number: _________________________________', { x: 50, y: p1H - 230, size: 10, font: fontRegular, color: rgb(0.3, 0.35, 0.4) });

  // Section 2: Scope & Fees
  page1.drawText('2. COMMENCEMENT & MONTHLY FEE SCHEDULE', { x: 40, y: p1H - 280, size: 12, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page1.drawLine({ start: { x: 40, y: p1H - 286 }, end: { x: p1W - 40, y: p1H - 286 }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });

  page1.drawText('2.1 The agreed monthly service subscription fee payable in South African Rand (ZAR) is:', {
    x: 40,
    y: p1H - 305,
    size: 9,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });

  page1.drawText('Monthly Fee (ZAR): R ______________________ per month, payable on or before 1st of each calendar month.', {
    x: 50,
    y: p1H - 330,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.35),
  });

  // Section 3: Legal Terms
  page1.drawText('3. STATUTORY COMPLIANCE & LEGAL NOTICE', { x: 40, y: p1H - 370, size: 12, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  page1.drawLine({ start: { x: 40, y: p1H - 376 }, end: { x: p1W - 40, y: p1H - 376 }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });

  const clauseLines = [
    '3.1 In terms of Section 13(2) and 13(3) of the Electronic Communications and Transactions Act 25 of 2002, the parties',
    '    expressly agree and consent to transact, verify, and execute this document by way of electronic signature.',
    '3.2 In terms of Section 15 of ECTA, the electronic data message and tamper-evident SHA-256 cryptographic seal generated',
    '    upon completion shall be admissible in evidence and presumed correct in any competent court in South Africa.',
    '3.3 All personal information processed in connection with this agreement is handled strictly in accordance with POPIA 4 of 2013.',
  ];

  let lineY = p1H - 398;
  for (const line of clauseLines) {
    page1.drawText(line, { x: 40, y: lineY, size: 8.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
    lineY -= 16;
  }

  // Page 2: Signatures Execution Page
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2W, height: p2H } = page2.getSize();

  page2.drawText('MASTER SERVICES AGREEMENT — EXECUTION & SIGNATURES', {
    x: 40,
    y: p2H - 50,
    size: 13,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  page2.drawLine({ start: { x: 40, y: p2H - 58 }, end: { x: p2W - 40, y: p2H - 58 }, thickness: 1, color: rgb(0.85, 0.88, 0.92) });

  page2.drawText('THUS DONE AND SIGNED BY THE RESPECTIVE PARTIES AS INDICATED BELOW:', {
    x: 40,
    y: p2H - 80,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.4),
  });

  // Client Signature Box (Left)
  page2.drawRectangle({
    x: 40,
    y: p2H - 240,
    width: 230,
    height: 140,
    color: rgb(0.98, 0.98, 1.0),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });
  page2.drawText('SIGNED FOR & ON BEHALF OF CLIENT:', { x: 50, y: p2H - 115, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
  page2.drawText('Signature: ___________________________', { x: 50, y: p2H - 170, size: 9, font: fontRegular, color: rgb(0.4, 0.45, 0.5) });
  page2.drawText('Date Signed: _________________________', { x: 50, y: p2H - 215, size: 9, font: fontRegular, color: rgb(0.4, 0.45, 0.5) });

  // Service Provider Signature Box (Right)
  page2.drawRectangle({
    x: p2W - 270,
    y: p2H - 240,
    width: 230,
    height: 140,
    color: rgb(0.98, 0.98, 1.0),
    borderColor: rgb(0.8, 0.85, 0.95),
    borderWidth: 1,
  });
  page2.drawText('SIGNED FOR SERVICE PROVIDER:', { x: p2W - 260, y: p2H - 115, size: 8.5, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
  page2.drawText('Signature: ___________________________', { x: p2W - 260, y: p2H - 170, size: 9, font: fontRegular, color: rgb(0.4, 0.45, 0.5) });
  page2.drawText('Date Signed: _________________________', { x: p2W - 260, y: p2H - 215, size: 9, font: fontRegular, color: rgb(0.4, 0.45, 0.5) });

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');
  return {
    buffer: pdfBytes.buffer as ArrayBuffer,
    base64,
  };
}
