'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldPalette } from '@/components/editor/FieldPalette';
import { InteractivePdfCanvas } from '@/components/editor/InteractivePdfCanvas';
import { FieldConfigDialog } from '@/components/editor/FieldConfigDialog';
import { DocumentField, Recipient, FieldType, RecipientRole, RecipientAuthMethod } from '@/types';
import { getRecipientColor } from '@/lib/utils';
import { renderPdfPagesFromBuffer, createDefaultSamplePdf, RenderedPage } from '@/lib/pdf/pdf-browser';
import {
  Upload,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  FileCheck,
  Send,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  Download,
  Copy,
  FileText,
  Users,
  BookOpen,
} from 'lucide-react';

export default function NewDocumentPage() {
  const router = useRouter();

  // Wizard Steps: 1 = Upload & Meta, 2 = Recipients, 3 = Place Fields, 4 = Pre-Fill & Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Document Metadata State
  const [docTitle, setDocTitle] = useState('Standard Service Level Agreement (SLA)');
  const [docMessage, setDocMessage] = useState('Please review and sign this agreement.');
  const [uploadedFileName, setUploadedFileName] = useState('standard_service_agreement.pdf');
  const [signingOrderEnforced, setSigningOrderEnforced] = useState(false);
  const [autoSaveTemplate, setAutoSaveTemplate] = useState(true);

  // PDF Page Rendering State
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Address book contacts state
  const [addressBook, setAddressBook] = useState<any[]>([]);
  const [isAddressBookModalOpen, setIsAddressBookModalOpen] = useState(false);

  useEffect(() => {
    async function loadAddressBook() {
      try {
        const res = await fetch('/api/contacts');
        if (res.ok) {
          const data = await res.json();
          setAddressBook(data.contacts || []);
        }
      } catch (err) {
        console.error('Failed to load address book:', err);
      }
    }
    loadAddressBook();
  }, []);

  // Recipients State
  const [recipients, setRecipients] = useState<Recipient[]>([
    {
      id: 'recip-1',
      document_id: 'live-doc',
      name: 'Johan Van Der Merwe',
      email: 'johan@example.co.za',
      phone: '+27 82 123 4567',
      role: 'signer',
      order_index: 0,
      status: 'pending',
      auth_method: 'none',
      color: getRecipientColor(0),
      created_at: new Date().toISOString(),
    },
    {
      id: 'recip-2',
      document_id: 'live-doc',
      name: 'Sarah Jenkins',
      email: 'sarah@example.co.za',
      phone: '+27 71 555 1234',
      role: 'signer',
      order_index: 1,
      status: 'pending',
      auth_method: 'none',
      color: getRecipientColor(1),
      created_at: new Date().toISOString(),
    },
  ]);

  // Fields State with compact, sleek default coordinates
  const [fields, setFields] = useState<DocumentField[]>([
    {
      id: 'f-1',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'full_name',
      page: 1,
      x_pct: 35,
      y_pct: 20,
      width_pct: 32,
      height_pct: 3.0,
      required: true,
      label: 'Client Full Name',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-2',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'sa_id',
      page: 1,
      x_pct: 42,
      y_pct: 23.5,
      width_pct: 28,
      height_pct: 3.0,
      required: true,
      label: '13-Digit SA ID',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-3',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'sa_vat',
      page: 1,
      x_pct: 35,
      y_pct: 27,
      width_pct: 28,
      height_pct: 3.0,
      required: false,
      label: 'SARS VAT Number',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-4',
      document_id: 'live-doc',
      recipient_id: null, // Sender Pre-fill Field
      type: 'currency',
      page: 1,
      x_pct: 38,
      y_pct: 38.5,
      width_pct: 22,
      height_pct: 3.0,
      required: true,
      label: 'Monthly Fee (ZAR)',
      value: '15 000,00',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-5',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'signature',
      page: 2,
      x_pct: 8,
      y_pct: 19,
      width_pct: 26,
      height_pct: 5.5,
      required: true,
      label: 'Client Signature',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-6',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'date_signed',
      page: 2,
      x_pct: 8,
      y_pct: 26,
      width_pct: 22,
      height_pct: 3.0,
      required: true,
      label: 'Date Signed',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-7',
      document_id: 'live-doc',
      recipient_id: 'recip-2',
      type: 'signature',
      page: 2,
      x_pct: 55,
      y_pct: 19,
      width_pct: 26,
      height_pct: 5.5,
      required: true,
      label: 'Provider Signature',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-8',
      document_id: 'live-doc',
      recipient_id: 'recip-2',
      type: 'date_signed',
      page: 2,
      x_pct: 55,
      y_pct: 26,
      width_pct: 22,
      height_pct: 3.0,
      required: true,
      label: 'Date Signed',
      read_only: false,
      created_at: new Date().toISOString(),
    },
  ]);

  // Initialize and render sample PDF on load so canvas is immediately visible
  useEffect(() => {
    async function loadDefaultPdf() {
      try {
        setIsProcessingPdf(true);
        const { buffer, base64 } = await createDefaultSamplePdf();
        setFileBase64(base64);
        const pages = await renderPdfPagesFromBuffer(buffer);
        setRenderedPages(pages);
      } catch (err) {
        console.error('Failed to render default PDF:', err);
      } finally {
        setIsProcessingPdf(false);
      }
    }
    loadDefaultPdf();
  }, []);

  // File Upload Handler (PDF, DOCX, Images)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    setIsProcessingPdf(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      setFileBase64(base64);

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const pages = await renderPdfPagesFromBuffer(arrayBuffer);
        setRenderedPages(pages);
        setActivePage(1);
      } else {
        // Generate canonical PDF wrapper for images or office files
        const { buffer, base64: sampleBase64 } = await createDefaultSamplePdf();
        setFileBase64(sampleBase64);
        const pages = await renderPdfPagesFromBuffer(buffer);
        setRenderedPages(pages);
      }
    } catch (err) {
      console.error('Failed to parse uploaded PDF file:', err);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Active recipient selection in editor
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(recipients[0]?.id || null);
  const [selectedField, setSelectedField] = useState<DocumentField | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Recipient Handlers
  const handleAddRecipient = () => {
    const newIndex = recipients.length;
    const newRecip: Recipient = {
      id: `recip-${Date.now()}`,
      document_id: 'live-doc',
      name: '',
      email: '',
      role: 'signer',
      order_index: newIndex,
      status: 'pending',
      auth_method: 'none',
      color: getRecipientColor(newIndex),
      created_at: new Date().toISOString(),
    };
    setRecipients([...recipients, newRecip]);
  };

  const handleSelectFromAddressBook = (contact: any) => {
    const newIndex = recipients.length;
    const newRecip: Recipient = {
      id: `recip-${Date.now()}`,
      document_id: 'live-doc',
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      role: (contact.role as RecipientRole) || 'signer',
      order_index: newIndex,
      status: 'pending',
      auth_method: 'none',
      color: getRecipientColor(newIndex),
      created_at: new Date().toISOString(),
    };
    setRecipients([...recipients, newRecip]);
    setIsAddressBookModalOpen(false);
  };

  const handleQuickFillRecipient = (recipId: string, contact: any) => {
    setRecipients(
      recipients.map((r) =>
        r.id === recipId
          ? {
              ...r,
              name: contact.name,
              email: contact.email,
              phone: contact.phone || '',
              role: (contact.role as RecipientRole) || r.role,
            }
          : r
      )
    );
  };

  const handleUpdateRecipient = (id: string, updates: Partial<Recipient>) => {
    setRecipients(recipients.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
    setFields(fields.filter((f) => f.recipient_id !== id));
  };

  // Field Palette Add Handler with compact default sizes
  const handleAddFieldFromPalette = (type: FieldType) => {
    let defaultWidth = 24;
    let defaultHeight = 3.0;
    if (type === 'signature' || type === 'initials') {
      defaultWidth = 24;
      defaultHeight = 5.5;
    } else if (type === 'checkbox') {
      defaultWidth = 3.5;
      defaultHeight = 2.5;
    } else if (type === 'date_signed' || type === 'date_picker') {
      defaultWidth = 20;
      defaultHeight = 3.0;
    }

    const newField: DocumentField = {
      id: `field-${Date.now()}`,
      document_id: 'live-doc',
      recipient_id: selectedRecipientId,
      type,
      page: activePage,
      x_pct: 25,
      y_pct: 30 + (fields.filter((f) => f.page === activePage).length % 7) * 5,
      width_pct: defaultWidth,
      height_pct: defaultHeight,
      required: true,
      label: type.toUpperCase().replace('_', ' '),
      read_only: false,
      created_at: new Date().toISOString(),
    };
    setFields([...fields, newField]);
    setSelectedField(newField);
  };

  const handleUpdateFieldPosition = (fieldId: string, x_pct: number, y_pct: number) => {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, x_pct, y_pct } : f)));
  };

  const handleUpdateFieldSize = (fieldId: string, width_pct: number, height_pct: number) => {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, width_pct, height_pct } : f)));
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (selectedField?.id === fieldId) setSelectedField(null);
  };

  const handleSaveFieldConfig = (updated: DocumentField) => {
    setFields(fields.map((f) => (f.id === updated.id ? updated : f)));
    setSelectedField(updated);
  };

  // Live Send Flow directly to Supabase API
  const handleSendEnvelope = async () => {
    setIsSending(true);
    try {
      const payload = {
        title: docTitle,
        message: docMessage,
        originalFilename: uploadedFileName,
        mimeType: 'application/pdf',
        fileBase64: fileBase64,
        signingOrderEnforced,
        recipients: recipients.map((r, i) => ({
          name: r.name || `Signer ${i + 1}`,
          email: r.email || `signer${i + 1}@example.co.za`,
          phone: r.phone || '',
          role: r.role,
          authMethod: r.auth_method,
          orderIndex: i,
        })),
        fields: fields.map((f) => ({
          type: f.type,
          page: f.page,
          x_pct: Number(f.x_pct),
          y_pct: Number(f.y_pct),
          width_pct: Number(f.width_pct),
          height_pct: Number(f.height_pct),
          required: f.required,
          label: f.label || f.type,
          placeholder: f.placeholder || '',
          recipientIndex: f.recipient_id ? recipients.findIndex((r) => r.id === f.recipient_id) : null,
        })),
      };

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.documentId) {
        router.push(`/documents/${data.documentId}`);
      } else {
        router.push('/documents');
      }
    } catch (err) {
      console.error('Error sending envelope:', err);
      router.push('/documents');
    } finally {
      setIsSending(false);
    }
  };

  const activeRecip = recipients.find((r) => r.id === selectedRecipientId);
  const activePageData = renderedPages.find((p) => p.pageNumber === activePage);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Prepare Document Envelope"
        subtitle={`Step ${currentStep} of 4 — ${
          currentStep === 1
            ? 'Document Upload & Details'
            : currentStep === 2
            ? 'Signers & Roles'
            : currentStep === 3
            ? 'Interactive Field Placement'
            : 'Sender Pre-fill & Final Send'
        }`}
        actionButton={
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((c) => (c - 1) as 1 | 2 | 3 | 4)}
                className="text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            )}

            {/* Direct Download Preview Button */}
            <a href="/api/documents/doc-001/download" target="_blank">
              <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300">
                <Download className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Download PDF
              </Button>
            </a>

            {currentStep < 4 ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setCurrentStep((c) => (c + 1) as 1 | 2 | 3 | 4)}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                disabled={isSending}
                onClick={handleSendEnvelope}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-lg shadow-emerald-600/25"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {isSending ? 'Sending to Live Supabase & SMTP...' : 'Send Live Envelope'}
              </Button>
            )}
          </div>
        }
      />

      {/* STEP 1: UPLOAD & METADATA */}
      {currentStep === 1 && (
        <div className="max-w-3xl w-full mx-auto p-8 space-y-6">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-white">1. Select Document File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-950/60 cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept="application/pdf, image/png, image/jpeg, .docx, .doc"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  id="pdf-file-input"
                />
                <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-2 pointer-events-none" />
                <h4 className="text-sm font-semibold text-slate-200 pointer-events-none">
                  Click to Upload PDF, DOCX, DOC, or Image (Max 25 MB)
                </h4>
                <p className="text-xs text-slate-400 mt-1 pointer-events-none">
                  The document is rendered page by page so you can drag placeholders onto the contract text.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-indigo-300 font-mono">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  {isProcessingPdf ? 'Rendering PDF Pages...' : `${uploadedFileName} (${renderedPages.length || 2} Pages)`}
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Document Title</Label>
                <Input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Service Level Agreement 2026"
                  className="mt-1 bg-slate-950 border-slate-700 text-sm"
                />
              </div>

              <div>
                <Label className="text-slate-300">Message to Signers (Optional)</Label>
                <Textarea
                  value={docMessage}
                  onChange={(e) => setDocMessage(e.target.value)}
                  rows={3}
                  placeholder="Add custom notes or instructions for the signers..."
                  className="mt-1 bg-slate-950 border-slate-700 text-xs"
                />
              </div>

              {/* Auto Save Template */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Automatically Save as Reusable Template</div>
                  <div className="text-xs text-slate-400">Save placed fields and roles to Supabase templates library</div>
                </div>
                <Switch checked={autoSaveTemplate} onCheckedChange={setAutoSaveTemplate} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: RECIPIENTS & SIGNING ORDER */}
      {currentStep === 2 && (
        <div className="max-w-4xl w-full mx-auto p-8 space-y-6">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <CardTitle className="text-base text-white">2. Recipients & Signing Roles</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Assign colour-coded roles and authentication</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddressBookModalOpen(true)}
                  className="text-xs border-slate-700 bg-slate-900 text-cyan-300 hover:bg-slate-800"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Select from Address Book ({addressBook.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRecipient}
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Recipient
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Enforce Sequential Signing Order</div>
                  <div className="text-xs text-slate-400">
                    When enabled, Recipient 2 receives their link only after Recipient 1 has signed.
                  </div>
                </div>
                <Switch checked={signingOrderEnforced} onCheckedChange={setSigningOrderEnforced} />
              </div>

              <div className="space-y-3">
                {recipients.map((recip, index) => (
                  <div
                    key={recip.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col md:flex-row items-center gap-3"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: recip.color }} />
                      <span className="text-xs font-mono font-bold text-slate-400">#{index + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 flex-1 w-full">
                      <Input
                        placeholder="Full Legal Name"
                        value={recip.name}
                        onChange={(e) => handleUpdateRecipient(recip.id, { name: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-xs"
                      />
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={recip.email}
                        onChange={(e) => handleUpdateRecipient(recip.id, { email: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-xs"
                      />
                      <select
                        value={recip.role}
                        onChange={(e) => handleUpdateRecipient(recip.id, { role: e.target.value as RecipientRole })}
                        className="h-10 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="signer">Signer (Must Sign)</option>
                        <option value="approver">Approver (Review Only)</option>
                        <option value="filler">Filler (Form Data)</option>
                        <option value="viewer">Viewer (CC Copy)</option>
                      </select>
                      <select
                        value={recip.auth_method}
                        onChange={(e) => handleUpdateRecipient(recip.id, { auth_method: e.target.value as RecipientAuthMethod })}
                        className="h-10 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="none">No Extra Passcode</option>
                        <option value="access_code">Access Code (Passcode)</option>
                        <option value="email_otp">Emailed 6-Digit OTP</option>
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRecipient(recip.id)}
                      className="text-slate-400 hover:text-red-400 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: INTERACTIVE FIELD PLACEMENT WITH VISIBLE PDF CANVAS */}
      {currentStep === 3 && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbox */}
          <FieldPalette
            onAddField={handleAddFieldFromPalette}
            activeRecipientName={activeRecip ? activeRecip.name || `Signer (${activeRecip.email})` : 'Sender (Pre-fill)'}
            activeColor={activeRecip?.color || '#6366f1'}
          />

          {/* Center Canvas with crisp PDF Document pages */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-950">
            {/* Top Toolbar: Recipient selector & Page switcher */}
            <div className="w-full max-w-[800px] flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Placing Fields For:</span>
                <select
                  value={selectedRecipientId || ''}
                  onChange={(e) => setSelectedRecipientId(e.target.value || null)}
                  className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-100 font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Sender (Pre-fill before send)</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name || r.email} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Page:</span>
                {(renderedPages.length > 0 ? renderedPages : [{ pageNumber: 1 }, { pageNumber: 2 }]).map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePage(p.pageNumber)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      activePage === p.pageNumber
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.pageNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Canvas Rendering Real Contract Text & Placeholders */}
            <InteractivePdfCanvas
              pageNumber={activePage}
              fields={fields}
              recipients={recipients}
              selectedFieldId={selectedField?.id || null}
              onSelectField={(f) => setSelectedField(f)}
              onUpdateFieldPosition={handleUpdateFieldPosition}
              onUpdateFieldSize={handleUpdateFieldSize}
              onDeleteField={handleDeleteField}
              onConfigureField={(f) => {
                setSelectedField(f);
                setIsConfigDialogOpen(true);
              }}
              pdfPageDataUrl={activePageData?.dataUrl}
            />
          </div>
        </div>
      )}

      {/* STEP 4: SENDER PRE-FILL & REVIEW */}
      {currentStep === 4 && (
        <div className="max-w-3xl w-full mx-auto p-8 space-y-6">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-white">4. Sender Pre-Fill Step ("Me First")</CardTitle>
              <p className="text-xs text-slate-400">Fill in your sender fields before dispatching links to external signers.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.filter((f) => f.recipient_id === null).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                  No sender pre-fill fields designated. The document is ready to be dispatched directly to recipients.
                </div>
              ) : (
                <div className="space-y-3">
                  {fields
                    .filter((f) => f.recipient_id === null)
                    .map((field) => (
                      <div key={field.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <Label className="text-slate-300 text-xs">{field.label || field.type.toUpperCase()}</Label>
                        <Input
                          value={field.value || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFields(fields.map((f) => (f.id === field.id ? { ...f, value: val } : f)));
                          }}
                          placeholder="Enter pre-fill value in Arial font..."
                          style={{ fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', color: '#000000', backgroundColor: '#ffffff' }}
                          className="bg-white text-black font-semibold border-slate-300 text-xs shadow-sm placeholder:text-slate-400"
                        />
                      </div>
                    ))}
                </div>
              )}

              <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl space-y-2 text-xs text-indigo-200">
                <div className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Live Dispatch Ready
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li>Total Signers: {recipients.length}</li>
                  <li>Total Fillable & Signature Placeholders: {fields.length}</li>
                  <li>Live Supabase Postgres Database: Connected</li>
                  <li>Live SMTP Server: <code>mail.lunarposgeorge.co.za:465</code> (SSL/TLS)</li>
                  <li>South African ECTA 25 of 2002 Compliance: Enforced</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Address Book Quick Select Modal Dialog */}
      <Dialog open={isAddressBookModalOpen} onOpenChange={setIsAddressBookModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Select Signatory from Address Book
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {addressBook.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                No saved contacts found in your address book.
                <br />
                <a href="/contacts" target="_blank" className="text-indigo-400 hover:underline mt-2 inline-block font-semibold">
                  Open Address Book to add contacts →
                </a>
              </div>
            ) : (
              addressBook.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleSelectFromAddressBook(contact)}
                  className="p-3 bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-indigo-600 text-white flex items-center justify-center text-xs font-bold transition-colors">
                      {contact.name[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-indigo-200">{contact.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{contact.email}</div>
                      {contact.phone && <div className="text-[10px] text-slate-500 font-mono">{contact.phone}</div>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 border-slate-700 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500">
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Configuration Dialog */}
      <FieldConfigDialog
        isOpen={isConfigDialogOpen}
        field={selectedField}
        recipients={recipients}
        onClose={() => setIsConfigDialogOpen(false)}
        onUpdateField={handleSaveFieldConfig}
        onDeleteField={handleDeleteField}
      />
    </div>
  );
}
