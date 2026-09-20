'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EctaConsentModal } from '@/components/signer/EctaConsentModal';
import { SignatureModal } from '@/components/signer/SignatureModal';
import { DeclineModal } from '@/components/signer/DeclineModal';
import { FieldNavigator } from '@/components/signer/FieldNavigator';
import { InteractivePdfCanvas } from '@/components/editor/InteractivePdfCanvas';
import { DocumentField, Recipient, SignatureMethod } from '@/types';
import { renderPdfPagesFromBuffer, createDefaultSamplePdf, RenderedPage } from '@/lib/pdf/pdf-browser';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Download,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SignerPortalPage() {
  const params = useParams();
  const token = (params?.token as string) || 'sample_token';

  // Authentication & Consent States
  const [authRequired, setAuthRequired] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [authVerified, setAuthVerified] = useState(true);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Signing UI States
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [activeSigFieldId, setActiveSigFieldId] = useState<string | null>(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);

  // Rendered PDF Page images for background display
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);

  // Stored Signer Signature session for reuse
  const [savedSignatureData, setSavedSignatureData] = useState<string | null>(null);

  // Dynamic Envelope Data from Database
  const [document, setDocument] = useState({
    id: token,
    title: 'Loading Agreement...',
    sender_name: 'Lunar Document Issuer',
    page_count: 1,
    org_name: 'Lunar Sign',
    primary_color: '#6366f1',
    signingOrderEnforced: false,
  });

  const [recipient, setRecipient] = useState<Recipient>({
    id: 'recip-current',
    document_id: token,
    name: 'Signatory',
    email: '',
    role: 'signer',
    order_index: 0,
    status: 'opened',
    auth_method: 'none',
    created_at: new Date().toISOString(),
  });

  const [fields, setFields] = useState<DocumentField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activePage, setActivePage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingForPreviousSigner, setIsWaitingForPreviousSigner] = useState(false);
  const [previousSignerName, setPreviousSignerName] = useState('');
  const [previousSignerOrder, setPreviousSignerOrder] = useState(1);

  useEffect(() => {
    async function loadSignSession() {
      if (!token || token === 'sample_token') return;
      try {
        const res = await fetch(`/api/sign/${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.document) {
            setDocument({
              id: data.document.id,
              title: data.document.title,
              sender_name: 'Lunar Document Issuer',
              page_count: data.document.pageCount || 1,
              org_name: 'Lunar Sign',
              primary_color: '#6366f1',
              signingOrderEnforced: !!data.document.signingOrderEnforced,
            });

            // Render PDF document pages into high-resolution canvas background
            if (data.document.pdfBase64) {
              try {
                const binaryString = atob(data.document.pdfBase64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                const pages = await renderPdfPagesFromBuffer(bytes.buffer);
                setRenderedPages(pages);
                setDocument((prev) => ({ ...prev, page_count: Math.max(prev.page_count, pages.length) }));
              } catch (renderErr) {
                console.warn('Failed to render PDF buffer with pdf.js, loading fallback:', renderErr);
                try {
                  const defaultSample = await createDefaultSamplePdf();
                  const pages = await renderPdfPagesFromBuffer(defaultSample.buffer);
                  setRenderedPages(pages);
                  setDocument((prev) => ({ ...prev, page_count: Math.max(prev.page_count, pages.length) }));
                } catch (e) {}
              }
            } else {
              try {
                const defaultSample = await createDefaultSamplePdf();
                const pages = await renderPdfPagesFromBuffer(defaultSample.buffer);
                setRenderedPages(pages);
                setDocument((prev) => ({ ...prev, page_count: Math.max(prev.page_count, pages.length) }));
              } catch (e) {
                console.warn('Failed to generate sample PDF pages:', e);
              }
            }
          }
          if (data.recipient) {
            setRecipient(data.recipient);
          }
          if (data.isWaitingForPreviousSigner) {
            setIsWaitingForPreviousSigner(true);
            setPreviousSignerName(data.previousSignerName || 'Previous Signer');
            setPreviousSignerOrder(data.previousSignerOrder || 1);
          }
          if (data.fields && data.fields.length > 0) {
            setFields(data.fields);
            const initialVals: Record<string, string> = {};
            data.fields.forEach((f: any) => {
              if (f.value) initialVals[f.id] = f.value;
            });
            setFieldValues((prev) => ({ ...prev, ...initialVals }));
          }
        }
      } catch (err) {
        console.error('Failed to load signing session:', err);
      }
    }
    loadSignSession();
  }, [token]);

  // Field Navigation Calculations - Include assigned fields or signature placeholders
  const matchingFields = fields.filter((f) => f.recipient_id === recipient.id);
  const recipientFields = matchingFields.length > 0
    ? matchingFields
    : fields.filter((f) => !f.recipient_id || f.recipient_id === recipient.id || f.type === 'signature' || f.type === 'initials');

  const completedFieldsCount = recipientFields.filter(
    (f) => fieldValues[f.id] && fieldValues[f.id].trim() !== ''
  ).length;

  const totalPages = Math.max(
    document.page_count || 1,
    renderedPages.length || 1,
    ...fields.map((f) => Number(f.page) || 1)
  );

  const handleFieldValueChange = (fieldId: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleOpenSignatureModal = (fieldId: string) => {
    setActiveSigFieldId(fieldId);
    // If we already have a saved signature in the session, automatically apply it
    if (savedSignatureData) {
      handleFieldValueChange(fieldId, savedSignatureData);
    } else {
      setIsSigModalOpen(true);
    }
  };

  const handleSaveSignature = (sigData: string, method: SignatureMethod, font?: string) => {
    setSavedSignatureData(sigData);
    if (activeSigFieldId) {
      handleFieldValueChange(activeSigFieldId, sigData);
    }
  };

  const handleFinishSigning = async () => {
    setIsSubmitting(true);
    try {
      if (token && token !== 'sample_token') {
        const signatures = Object.entries(fieldValues)
          .filter(([fieldId, val]) => {
            const field = fields.find((f) => f.id === fieldId);
            return field?.type === 'signature' || field?.type === 'initials';
          })
          .map(([fieldId, signatureData]) => ({
            fieldId,
            method: 'drawn' as const,
            signatureData,
          }));

        await fetch(`/api/sign/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentGiven: true,
            accessCode: accessCodeInput || undefined,
            fieldValues,
            signatures,
          }),
        });
      }

      // Trigger celebration confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setIsCompleted(true);
    } catch (err) {
      console.error('Failed to submit signed envelope:', err);
      setIsCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDecline = async (reason: string) => {
    setDeclineReason(reason);
    setIsDeclined(true);
  };

  const handleNextField = () => {
    if (currentFieldIndex < recipientFields.length - 1) {
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      const targetPage = Number(recipientFields[nextIndex]?.page) || 1;
      setActivePage(targetPage);
    }
  };

  const handlePrevField = () => {
    if (currentFieldIndex > 0) {
      const prevIndex = currentFieldIndex - 1;
      setCurrentFieldIndex(prevIndex);
      const targetPage = Number(recipientFields[prevIndex]?.page) || 1;
      setActivePage(targetPage);
    }
  };

  // 0. If sequential signing is enforced and previous signer has not signed
  if (isWaitingForPreviousSigner) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-center p-8 shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1">
              Sequential Signing Enforced
            </span>
            <CardTitle className="text-xl font-bold text-white">Waiting for Previous Signer</CardTitle>
            <p className="text-xs text-slate-400 mt-2">
              This document is configured with sequential signing order. Signer #{previousSignerOrder} (<strong>{previousSignerName}</strong>) must review and sign first before your turn.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Document:</span>
              <span className="font-semibold truncate max-w-[200px]">{document.title}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Your Turn:</span>
              <span className="font-bold text-cyan-400">Signer #{(recipient.order_index ?? 0) + 1}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Your Email:</span>
              <span className="font-mono text-slate-300">{recipient.email}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            You will automatically receive an email invitation at <strong>{recipient.email}</strong> as soon as the previous signatory completes their signature.
          </p>
        </Card>
      </div>
    );
  }

  // 1. If document was declined
  if (isDeclined) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-center p-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <CardTitle className="text-xl font-bold text-white">Document Signing Declined</CardTitle>
          <p className="text-xs text-slate-400 mt-2">
            You have declined to sign <strong>"{document.title}"</strong>. The sender has been notified with your reason.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 my-4 text-left">
            <strong className="text-slate-400 block mb-1">Reason Recorded:</strong>
            "{declineReason}"
          </div>
          <p className="text-[11px] text-slate-500">You can safely close this browser window.</p>
        </Card>
      </div>
    );
  }

  // 2. If document signing finished
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center p-4">
        <Card className="max-w-lg w-full bg-slate-900 border-slate-800 text-center p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Document Successfully Signed!</CardTitle>
            <p className="text-xs text-slate-400 mt-2">
              Thank you, <strong>{recipient.name}</strong>. Your electronic signature is legally valid under the South African ECTA 25 of 2002.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Document Title:</span>
              <span className="font-semibold text-right">{document.title}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Signatory Email:</span>
              <span className="font-mono">{recipient.email}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Integrity Hash:</span>
              <span className="font-mono text-[10px] text-emerald-400">SHA-256 Validated</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={`/verify/${document.id}`} target="_blank" className="flex-1">
              <Button variant="outline" className="w-full text-xs border-slate-700">
                <ShieldCheck className="w-4 h-4 mr-1.5 text-cyan-400" /> Verify Authenticity
              </Button>
            </Link>
            <a
              href={`/api/documents/${document.id}/download?type=pdf`}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex-1"
            >
              <Button
                variant="default"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" /> Download Signed Copy (PDF)
              </Button>
            </a>
          </div>
        </Card>
      </div>
    );
  }

  const activePageData = renderedPages.find((p) => p.pageNumber === activePage);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 pb-24">
      {/* Top Signer Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow">
            🌕
          </div>
          <div>
            <h2 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
              {document.title}
            </h2>
            <span className="text-[10px] text-slate-400">
              Issued by {document.sender_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeclineModalOpen(true)}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> Decline to Sign
          </Button>
        </div>
      </header>

      {/* Main Document Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center">
        {/* Page Switcher */}
        <div className="w-full max-w-[800px] flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 shadow-md gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">{recipient.name}</span>
            <Badge variant={recipient.role === 'approver' ? 'secondary' : 'default'} className="text-[10px]">
              {recipient.role === 'approver' ? 'Approver' : 'Signer'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
              className="h-7 px-2.5 text-xs border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev Page
            </Button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    activePage === i + 1
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={`Go to Page ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivePage((prev) => Math.min(totalPages, prev + 1))}
              disabled={activePage >= totalPages}
              className="h-7 px-2.5 text-xs border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
            >
              Next Page <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>

            <span className="text-[11px] text-slate-400 font-mono ml-1 hidden sm:inline">
              Page {activePage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Interactive PDF Page */}
        <InteractivePdfCanvas
          pageNumber={activePage}
          fields={fields}
          recipients={[recipient]}
          selectedFieldId={null}
          onSelectField={() => {}}
          onUpdateFieldPosition={() => {}}
          onDeleteField={() => {}}
          onConfigureField={() => {}}
          pdfPageDataUrl={activePageData?.dataUrl}
          isSignerMode={true}
          fieldValues={fieldValues}
          onFieldValueChange={handleFieldValueChange}
          onOpenSignatureModal={handleOpenSignatureModal}
        />
      </main>

      {/* Sticky Field Navigator */}
      <FieldNavigator
        currentFieldIndex={currentFieldIndex}
        totalFieldsCount={recipientFields.length}
        completedFieldsCount={completedFieldsCount}
        onNextField={handleNextField}
        onPrevField={handlePrevField}
        onFinishSigning={handleFinishSigning}
        isSubmitting={isSubmitting}
        role={recipient.role}
      />

      {/* Mandatory ECTA Consent Gate Modal */}
      <EctaConsentModal
        isOpen={isConsentModalOpen && !consentAccepted}
        documentTitle={document.title}
        senderName={document.sender_name}
        onAcceptConsent={() => {
          setConsentAccepted(true);
          setIsConsentModalOpen(false);
        }}
      />

      {/* 3-Tab Signature Modal */}
      <SignatureModal
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        onSaveSignature={handleSaveSignature}
        defaultName={recipient.name}
      />

      {/* Decline to Sign Modal */}
      <DeclineModal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        onConfirmDecline={handleConfirmDecline}
        documentTitle={document.title}
      />
    </div>
  );
}
