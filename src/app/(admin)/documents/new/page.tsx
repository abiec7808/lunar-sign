'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FieldPalette } from '@/components/editor/FieldPalette';
import { InteractivePdfCanvas } from '@/components/editor/InteractivePdfCanvas';
import { FieldConfigDialog } from '@/components/editor/FieldConfigDialog';
import { DocumentField, Recipient, FieldType, RecipientRole, RecipientAuthMethod } from '@/types';
import { getRecipientColor, getRecipientTheme } from '@/lib/utils';
import { renderPdfPagesFromBuffer, createDefaultSamplePdf, RenderedPage } from '@/lib/pdf/pdf-browser';
import {
  Upload,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
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
  BookmarkPlus,
  Link2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';

function NewDocumentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');
  const isTemplateEditMode = searchParams.get('mode') === 'edit_template';

  // Wizard Steps: 1 = Upload & Meta, 2 = Recipients, 3 = Place Fields, 4 = Pre-Fill & Review
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(templateId ? (isTemplateEditMode ? 3 : 2) : 1);

  // Document Metadata State
  const [docTitle, setDocTitle] = useState('Standard Service Level Agreement (SLA)');
  const [docMessage, setDocMessage] = useState('Please review and sign this agreement.');
  const [uploadedFileName, setUploadedFileName] = useState('standard_service_agreement.pdf');
  const [signingOrderEnforced, setSigningOrderEnforced] = useState(false);
  const [autoSaveTemplate, setAutoSaveTemplate] = useState(false);

  // PDF Page Rendering State
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Address book contacts state
  const [addressBook, setAddressBook] = useState<any[]>([]);
  const [isAddressBookModalOpen, setIsAddressBookModalOpen] = useState(false);

  // Template saving state
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateNotification, setTemplateNotification] = useState<string | null>(null);

  // Dispatch success modal state
  const [sentSuccessData, setSentSuccessData] = useState<any | null>(null);
  const [copiedSuccessIndex, setCopiedSuccessIndex] = useState<number | null>(null);

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

  // Recipients State (Clean blank state ready for customer input or address book pick)
  const [recipients, setRecipients] = useState<Recipient[]>([
    {
      id: 'recip-1',
      document_id: 'live-doc',
      name: '',
      email: '',
      phone: '',
      role: 'signer',
      order_index: 0,
      status: 'pending',
      auth_method: 'none',
      color: getRecipientColor(0),
      created_at: new Date().toISOString(),
    },
  ]);

  // Fields State
  const [fields, setFields] = useState<DocumentField[]>([
    {
      id: 'f-1',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'signature',
      page: 1,
      x_pct: 15,
      y_pct: 75,
      width_pct: 26,
      height_pct: 5.5,
      required: true,
      label: 'Client Signature',
      read_only: false,
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-2',
      document_id: 'live-doc',
      recipient_id: 'recip-1',
      type: 'date_signed',
      page: 1,
      x_pct: 55,
      y_pct: 75,
      width_pct: 22,
      height_pct: 3.5,
      required: true,
      label: 'Date Signed',
      read_only: false,
      created_at: new Date().toISOString(),
    },
  ]);

  // Load Template if templateId is provided in URL
  useEffect(() => {
    async function loadTemplate() {
      if (!templateId) return;
      try {
        setIsProcessingPdf(true);
        const res = await fetch(`/api/templates/${templateId}`);
        if (res.ok) {
          const data = await res.json();
          const tpl = data.template;
          if (tpl) {
            const customTitleFromUrl = searchParams.get('title');
            const customMsgFromUrl = searchParams.get('message');
            setDocTitle(customTitleFromUrl || tpl.name || 'Contract Agreement');
            if (customMsgFromUrl) {
              setDocMessage(customMsgFromUrl);
            } else if (tpl.description) {
              setDocMessage(tpl.description);
            }
            setTemplateName(tpl.name || '');

            let defs: any = tpl.field_definitions;
            if (typeof defs === 'string') {
              try { defs = JSON.parse(defs); } catch (e) {}
            }

            const base64ToUse = tpl.pdf_base64 || defs?.fileBase64 || defs?.pdfBase64;

            if (base64ToUse) {
              setFileBase64(base64ToUse);
              try {
                const buffer = Buffer.from(base64ToUse, 'base64');
                const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
                const pages = await renderPdfPagesFromBuffer(arrayBuf);
                setRenderedPages(pages);
              } catch (renderErr) {
                console.warn('Failed to render template PDF base64:', renderErr);
                const { buffer, base64 } = await createDefaultSamplePdf();
                setFileBase64(base64);
                const pages = await renderPdfPagesFromBuffer(buffer);
                setRenderedPages(pages);
              }
            } else {
              const { buffer, base64 } = await createDefaultSamplePdf();
              setFileBase64(base64);
              const pages = await renderPdfPagesFromBuffer(buffer);
              setRenderedPages(pages);
            }

            let rRoles: any = tpl.recipient_roles;
            if (typeof rRoles === 'string') {
              try { rRoles = JSON.parse(rRoles); } catch (e) {}
            }
            const newRecipients: Recipient[] = Array.isArray(rRoles) && rRoles.length > 0
              ? rRoles.map((r: any, idx: number) => ({
                  id: r.id || `recip-${idx + 1}`,
                  document_id: 'live-doc',
                  name: '',
                  email: '',
                  phone: '',
                  role: r.role || 'signer',
                  order_index: idx,
                  status: 'pending',
                  auth_method: r.authMethod || r.auth_method || 'none',
                  color: getRecipientColor(idx),
                  created_at: new Date().toISOString(),
                }))
              : [
                  {
                    id: 'recip-1',
                    document_id: 'live-doc',
                    name: '',
                    email: '',
                    phone: '',
                    role: 'signer',
                    order_index: 0,
                    status: 'pending',
                    auth_method: 'none',
                    color: getRecipientColor(0),
                    created_at: new Date().toISOString(),
                  },
                ];

            setRecipients(newRecipients);

            if (defs) {
              const rawFields = Array.isArray(defs.fields) ? defs.fields : Array.isArray(defs) ? defs : [];
              if (rawFields.length > 0) {
                const mappedFields = rawFields.map((f: any, fIdx: number) => {
                  let targetRecipId: string | null = null;
                  if (f.recipientIndex !== undefined && f.recipientIndex !== null && f.recipientIndex >= 0) {
                    targetRecipId = newRecipients[f.recipientIndex]?.id || null;
                  } else if (f.recipient_id) {
                    const matchedRecip = newRecipients.find((nr) => nr.id === f.recipient_id);
                    if (matchedRecip) {
                      targetRecipId = matchedRecip.id;
                    } else {
                      const oldIndex = Array.isArray(rRoles)
                        ? rRoles.findIndex((oldR: any) => oldR.id === f.recipient_id)
                        : -1;
                      if (oldIndex >= 0 && newRecipients[oldIndex]) {
                        targetRecipId = newRecipients[oldIndex].id;
                      } else if (f.type === 'signature' || f.type === 'initials') {
                        targetRecipId = newRecipients[0]?.id || 'recip-1';
                      }
                    }
                  } else if (f.type === 'signature' || f.type === 'initials') {
                    targetRecipId = newRecipients[0]?.id || 'recip-1';
                  }

                  return {
                    ...f,
                    id: f.id || `f-${Date.now()}-${fIdx}`,
                    recipient_id: targetRecipId,
                  };
                });
                setFields(mappedFields);
              }
            }

            if (isTemplateEditMode) {
              setCurrentStep(3);
              setTemplateNotification(`Template "${tpl.name}" loaded in Field Editor! Move, resize, or add placeholders below and click "Save Template Placeholders".`);
            } else {
              setCurrentStep(2);
              setTemplateNotification(`Template "${tpl.name}" loaded! Proceed with entering recipient details or click Step 3 to edit placeholders.`);
            }
            setTimeout(() => setTemplateNotification(null), 6000);
          }
        }
      } catch (err) {
        console.error('Failed to load template:', err);
      } finally {
        setIsProcessingPdf(false);
      }
    }
    loadTemplate();
  }, [templateId, isTemplateEditMode]);

  // Initialize and render sample PDF on load so canvas is immediately visible if no template loaded
  useEffect(() => {
    async function loadDefaultPdf() {
      if (templateId) return;
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
  }, [templateId]);

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

  const handleMoveRecipient = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === recipients.length - 1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    const updated = [...recipients];
    const item = updated[index];
    updated[index] = updated[target];
    updated[target] = item;
    const reindexed = updated.map((r, i) => ({ ...r, order_index: i }));
    setRecipients(reindexed);
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

  const handleUpdateLoadedTemplate = async () => {
    if (!templateId) return;
    try {
      setIsSavingTemplate(true);
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim() || docTitle.trim(),
          description: templateDescription.trim() || docMessage.trim(),
          fields,
          recipientRoles: recipients.map((r, i) => ({
            role: r.role || 'signer',
            label: r.name || `Signer ${i + 1}`,
            orderIndex: i,
            authMethod: r.auth_method,
          })),
          fileBase64,
          originalFilename: uploadedFileName,
        }),
      });

      if (res.ok) {
        setTemplateNotification(`Template "${templateName || docTitle}" successfully updated!`);
        setTimeout(() => setTemplateNotification(null), 5000);
        if (isTemplateEditMode) {
          setTimeout(() => router.push('/templates'), 1200);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update template');
      }
    } catch (err) {
      console.error('Error updating template:', err);
      alert('Failed to update template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveTemplate = async (forceNew = false) => {
    if (!templateName.trim()) {
      alert('Please enter a template name.');
      return;
    }

    try {
      setIsSavingTemplate(true);

      if (templateId && !forceNew) {
        // Update existing template
        const res = await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName.trim(),
            description: templateDescription.trim() || `Custom template for ${templateName.trim()}`,
            fields,
            recipientRoles: recipients.map((r, i) => ({
              role: r.role || 'signer',
              label: `Signer ${i + 1}`,
              orderIndex: i,
              authMethod: r.auth_method,
            })),
            fileBase64,
            originalFilename: uploadedFileName,
          }),
        });

        if (res.ok) {
          setIsSaveTemplateModalOpen(false);
          setTemplateNotification(`Template "${templateName.trim()}" successfully updated!`);
          setTimeout(() => setTemplateNotification(null), 5000);
          return;
        }
      }

      // Create new template
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || `Custom template for ${templateName.trim()}`,
          fields,
          recipientRoles: recipients.map((r, i) => ({
            role: r.role || 'signer',
            label: `Signer ${i + 1}`,
            orderIndex: i,
            authMethod: r.auth_method,
          })),
          fileBase64,
          originalFilename: uploadedFileName,
        }),
      });

      if (res.ok) {
        setIsSaveTemplateModalOpen(false);
        setTemplateNotification(`Template "${templateName.trim()}" successfully saved to your library!`);
        setTimeout(() => setTemplateNotification(null), 5000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save template');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Live Send Flow directly to Supabase API
  const handleSendEnvelope = async () => {
    const invalidRecip = recipients.find((r) => !r.email || !r.email.includes('@'));
    if (invalidRecip) {
      alert('Please provide a valid email address for all recipients in Step 2 before dispatching.');
      setCurrentStep(2);
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: docTitle || 'Service Level Agreement',
        message: docMessage,
        originalFilename: uploadedFileName || 'agreement.pdf',
        mimeType: 'application/pdf',
        fileBase64: fileBase64,
        signingOrderEnforced,
        recipients: recipients.map((r, i) => ({
          name: r.name.trim() || r.email.trim(),
          email: r.email.trim().toLowerCase(),
          phone: r.phone ? r.phone.trim() : '',
          role: r.role,
          authMethod: r.auth_method,
          orderIndex: i,
        })),
        fields: fields.map((f) => {
          let rIndex: number | null = null;
          if (f.recipient_id) {
            const idx = recipients.findIndex((r) => r.id === f.recipient_id);
            rIndex = idx >= 0 ? idx : null;
          }
          if (rIndex === null && (f.type === 'signature' || f.type === 'initials')) {
            rIndex = 0; // Default signature to 1st signer if unassigned
          }
          return {
            type: f.type,
            page: Number(f.page) || 1,
            x_pct: Number(f.x_pct),
            y_pct: Number(f.y_pct),
            width_pct: Number(f.width_pct),
            height_pct: Number(f.height_pct),
            required: f.required,
            label: f.label || f.type,
            placeholder: f.placeholder || '',
            value: f.value || f.default_value || undefined,
            recipientIndex: rIndex,
          };
        }),
      };

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.documentId) {
        setSentSuccessData(data);
      } else {
        alert(data.error || 'Failed to dispatch envelope.');
      }
    } catch (err: any) {
      console.error('Error sending envelope:', err);
      alert(err?.message || 'Failed to dispatch document envelope.');
    } finally {
      setIsSending(false);
    }
  };

  const activeRecip = recipients.find((r) => r.id === selectedRecipientId);
  const activePageData = renderedPages.find((p) => p.pageNumber === activePage);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title={isTemplateEditMode ? 'Visual Template Editor' : 'Prepare Document Envelope'}
        subtitle={
          isTemplateEditMode
            ? `Editing signature placements, initials, and fields for template: "${templateName || docTitle}"`
            : `Step ${currentStep} of 4 — ${
                currentStep === 1
                  ? 'Document Upload & Details'
                  : currentStep === 2
                  ? 'Signers & Roles'
                  : currentStep === 3
                  ? 'Interactive Field Placement'
                  : 'Sender Pre-fill & Final Send'
              }`
        }
        actionButton={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isTemplateEditMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/templates')}
                  className="text-xs border-slate-700 text-slate-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Templates
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={isSavingTemplate}
                  onClick={handleUpdateLoadedTemplate}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
                  {isSavingTemplate ? 'Saving Changes...' : 'Save Template Changes'}
                </Button>
              </>
            ) : (
              <>
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

                {templateId && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSavingTemplate}
                    onClick={handleUpdateLoadedTemplate}
                    className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                    title="Update the base template with your current field placements"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 mr-1" /> Update Base Template
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTemplateName(docTitle);
                    setIsSaveTemplateModalOpen(true);
                  }}
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 mr-1" /> Save as New Template
                </Button>

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
                    {isSending ? 'Sending to Live Supabase & Resend...' : 'Send Live Envelope'}
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {templateNotification && (
        <div className="max-w-7xl mx-auto px-6 pt-4 w-full">
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center justify-between shadow-lg">
            <span>{templateNotification}</span>
            <button onClick={() => setTemplateNotification(null)} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Persistent Document Title & Reference Bar (Custom naming for templates) */}
      <div className="max-w-7xl mx-auto px-6 pt-4 pb-1 w-full">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 shrink-0 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Document Title:
            </span>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. SLA - CHS or SLA - SPAR"
              className="bg-slate-950/90 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold text-white placeholder:text-slate-500 flex-1 max-w-lg shadow-inner"
            />
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 shrink-0">
            <span className="font-mono text-slate-500">
              {renderedPages.length || 2} Pages • {recipients.length} Signer{recipients.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Step Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-2 pb-1 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 text-xs shadow-md">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              currentStep === 1
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px]">1</span>
            <span>Document & File</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              currentStep === 2
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px]">2</span>
            <span>Signers & Roles ({recipients.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              currentStep === 3
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70 bg-indigo-500/10 border border-indigo-500/20'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px]">3</span>
            <span className="font-bold">Placeholders & Fields ({fields.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(4)}
            className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
              currentStep === 4
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/30 flex items-center justify-center text-[10px]">4</span>
            <span>Review & Pre-fill</span>
          </button>
        </div>
      </div>

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
          {/* Document & Envelope Title Customization (Enables custom agreement naming before dispatch) */}
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> Document Title & Envelope Details
              </CardTitle>
              <p className="text-xs text-slate-400">
                Customize the name of this agreement. This title is displayed to your clients, stamped on certificates, and used in email subjects.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-300">Document / Agreement Name</Label>
                  <Input
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Master Services Agreement - Surgical Sync (Pty) Ltd"
                    className="mt-1 bg-slate-950 border-slate-700 text-xs font-semibold text-white placeholder:text-slate-500 shadow-inner"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Email Subject: <span className="text-cyan-400 font-mono">Signature Requested: {docTitle || 'Agreement'}</span>
                  </span>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-300">Message to Signers (Optional)</Label>
                  <Input
                    value={docMessage}
                    onChange={(e) => setDocMessage(e.target.value)}
                    placeholder="e.g. Please review and sign the attached agreement."
                    className="mt-1 bg-slate-950 border-slate-700 text-xs text-slate-200 placeholder:text-slate-500 shadow-inner"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Included in the email notification body sent to all signers.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                {recipients.map((recip, index) => {
                  const theme = getRecipientTheme(recip.color || index);
                  const orderLabel = signingOrderEnforced
                    ? index === 0
                      ? 'Signs 1st (Initial Invitation)'
                      : `Signs #${index + 1} (After Signer ${index})`
                    : `Signer #${index + 1} (Parallel)`;

                  return (
                    <div
                      key={recip.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col md:flex-row items-center gap-3"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
                          style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                          title={`Color: ${theme.name}`}
                        >
                          #{index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-slate-200">
                            {recip.name?.trim() ? recip.name : `Signatory #${index + 1}`}
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono">{orderLabel}</span>
                        </div>
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

                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={index === 0}
                            onClick={() => handleMoveRecipient(index, 'up')}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-white disabled:opacity-20"
                            title="Move Earlier in Signing Order"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={index === recipients.length - 1}
                            onClick={() => handleMoveRecipient(index, 'down')}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-white disabled:opacity-20"
                            title="Move Later in Signing Order"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRecipient(recip.id)}
                          className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
                          title="Remove Recipient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: INTERACTIVE FIELD PLACEMENT */}
      {currentStep === 3 && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbox */}
          <FieldPalette
            onAddField={handleAddFieldFromPalette}
            activeRecipientName={activeRecip ? activeRecip.name || `Signer (${activeRecip.email || 'pending'})` : 'Sender (Pre-fill)'}
            activeColor={activeRecip?.color || '#6366f1'}
          />

          {/* Center Canvas with crisp PDF Document pages */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-950">
            {/* Top Toolbar: Interactive Signer Color Selector & Page Switcher */}
            <div className="w-full max-w-[800px] flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 shadow-lg gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-semibold mr-1">Placing For:</span>
                <button
                  type="button"
                  onClick={() => setSelectedRecipientId(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 ${
                    selectedRecipientId === null
                      ? 'bg-slate-700 text-white border-slate-500 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Sender (Pre-fill)</span>
                </button>
                {recipients.map((r, i) => {
                  const isSelected = selectedRecipientId === r.id;
                  const theme = getRecipientTheme(r.color || i);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRecipientId(r.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 shadow-sm"
                      style={{
                        backgroundColor: isSelected ? theme.badgeBg : '#020617',
                        color: isSelected ? theme.badgeText : '#cbd5e1',
                        borderColor: isSelected ? theme.primary : `${theme.primary}50`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isSelected ? '#ffffff' : theme.primary }}
                      />
                      <span>{r.name ? r.name.split(' ')[0] : `Signer ${i + 1}`}</span>
                    </button>
                  );
                })}
              </div>

              {/* Page Navigator & Quick Template Save */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
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

                {templateId && (
                  <Button
                    size="sm"
                    disabled={isSavingTemplate}
                    onClick={handleUpdateLoadedTemplate}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md h-7 px-2.5 ml-1.5"
                    title="Save all moved, resized, and added placeholders to this template"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                    {isSavingTemplate ? 'Saving...' : 'Save Template Placeholders'}
                  </Button>
                )}
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
        <div className="max-w-4xl w-full mx-auto p-8 space-y-6">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-white">4. Sender Pre-Fill & Envelope Review</CardTitle>
              <p className="text-xs text-slate-400">
                Review agreement details and fill in all prefilled contract sections before dispatching. Values entered here are permanently stamped onto the agreement.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Envelope Custom Document Title & Notification Message */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" /> Document Title & Notification Details
                  </div>
                  <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">
                    Visible to Customers
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-400">Document Title</Label>
                    <Input
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Enter custom document title..."
                      className="mt-1 bg-slate-900 border-slate-700 text-xs font-semibold text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-400">Email Invitation Message</Label>
                    <Input
                      value={docMessage}
                      onChange={(e) => setDocMessage(e.target.value)}
                      placeholder="Custom message to signers..."
                      className="mt-1 bg-slate-900 border-slate-700 text-xs text-slate-300"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5">
                  <span>Signer Email Subject Preview:</span>
                  <strong className="text-cyan-300 font-mono text-[11px]">Signature Requested: {docTitle || 'Agreement'}</strong>
                </div>
              </div>

              {/* 1. Sender Designated Pre-Fill Fields */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>Sender Pre-Fill Items ({fields.filter((f) => f.recipient_id === null).length})</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Stamped in crisp Arial font</span>
                </div>

                {fields.filter((f) => f.recipient_id === null).length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                    No sender pre-fill fields placed. To add text that you fill out before sending, place fields assigned to <strong>Sender (Pre-fill)</strong> in Step 3.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {fields
                      .filter((f) => f.recipient_id === null)
                      .map((field) => (
                        <div key={field.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-slate-300 text-xs font-semibold">{field.label || field.type.toUpperCase()}</Label>
                            <span className="text-[10px] text-slate-500 font-mono">Page {field.page}</span>
                          </div>
                          <Input
                            value={field.value || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFields(fields.map((f) => (f.id === field.id ? { ...f, value: val } : f)));
                            }}
                            placeholder="Enter prefilled value..."
                            style={{ fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', color: '#000000', backgroundColor: '#ffffff' }}
                            className="bg-white text-black font-semibold border-slate-300 text-xs shadow-sm placeholder:text-slate-400"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* 2. Signing Workflow Dispatch Overview */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Signer Execution Flow</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {signingOrderEnforced ? 'Sequential Signing' : 'Parallel Signing'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {recipients.map((r, i) => {
                    const theme = getRecipientTheme(r.color || i);
                    return (
                      <div
                        key={r.id}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]"
                            style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
                          >
                            {i + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-white">{r.name || 'Unnamed Signer'}</span>
                            <span className="text-slate-400 font-mono text-[11px] ml-2">({r.email || 'No email'})</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-medium text-cyan-400">
                          {signingOrderEnforced
                            ? i === 0
                              ? 'Receives email on send'
                              : `Receives email after Signer ${i}`
                            : 'Receives email immediately'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. System & Compliance Highlights */}
              <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl space-y-2 text-xs text-indigo-200">
                <div className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Live Dispatch Ready
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                  <li>Total Signers: {recipients.length}</li>
                  <li>Total Contract Placeholders: {fields.length}</li>
                  <li>South African ECTA 25 of 2002 & POPIA Compliance: Enforced</li>
                  <li>Digital Signature Certificates generated automatically upon completion</li>
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

      {/* Save Template Modal Dialog */}
      <Dialog open={isSaveTemplateModalOpen} onOpenChange={setIsSaveTemplateModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-indigo-400" /> Save as Reusable Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 my-2 text-xs">
            <div>
              <Label className="text-slate-300">Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Standard NDA / Service Agreement"
                className="mt-1 bg-slate-950 border-slate-700 text-xs"
              />
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <Textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template and when to use it..."
                rows={3}
                className="mt-1 bg-slate-950 border-slate-700 text-xs"
              />
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-slate-400 text-[11px]">
              <div>• Configured Fields: <strong className="text-slate-200">{fields.length} placeholders</strong></div>
              <div>• Configured Signer Roles: <strong className="text-slate-200">{recipients.length} roles</strong></div>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveTemplateModalOpen(false)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            {templateId && (
              <Button
                size="sm"
                disabled={isSavingTemplate}
                onClick={() => handleSaveTemplate(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25"
              >
                {isSavingTemplate ? 'Saving...' : 'Update Current Template'}
              </Button>
            )}
            <Button
              size="sm"
              disabled={isSavingTemplate}
              onClick={() => handleSaveTemplate(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25"
            >
              {isSavingTemplate ? 'Saving...' : templateId ? 'Save as New Template Copy' : 'Save Template'}
            </Button>
          </DialogFooter>
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

      {/* Envelope Dispatched Success Modal & Direct Signing Links */}
      <Dialog open={!!sentSuccessData} onOpenChange={(open) => { if (!open && sentSuccessData?.documentId) router.push(`/documents/${sentSuccessData.documentId}`); }}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Envelope Dispatched Successfully! 🚀</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  "{sentSuccessData?.title}" is live. You can copy the client signing links or share directly via WhatsApp.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="text-xs font-semibold text-slate-300">Client Direct Signing Links:</div>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(sentSuccessData?.recipients || []).map((r: any, i: number) => {
                const tokenOrId = r.token || r.id;
                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lunar-sign.netlify.app';
                const signingUrl = `${origin}/s/${tokenOrId}`;
                const isCopied = copiedSuccessIndex === i;

                const copyLink = () => {
                  navigator.clipboard.writeText(signingUrl);
                  setCopiedSuccessIndex(i);
                  setTimeout(() => setCopiedSuccessIndex(null), 2500);
                };

                const shareWhatsApp = () => {
                  const text = encodeURIComponent(`Hello ${r.name}, please review and sign "${sentSuccessData.title}" electronically here: ${signingUrl}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                };

                return (
                  <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-200">
                        {r.name} <span className="font-mono text-[11px] text-slate-500 font-normal">({r.email})</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/30">
                        Signer #{i + 1}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={signingUrl}
                        className="flex-1 bg-slate-900 text-slate-300 font-mono text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 select-all"
                      />
                      <Button
                        size="sm"
                        onClick={copyLink}
                        className={`text-xs h-7 px-2.5 font-semibold transition-all ${
                          isCopied
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isCopied ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" /> Copied!
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Copy className="w-3 h-3" /> Copy Link
                          </span>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={shareWhatsApp}
                        className="text-xs h-7 px-2.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/40 font-semibold"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-slate-800 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/documents')}
              className="text-xs border-slate-700 text-slate-300"
            >
              Go to All Documents
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/documents/${sentSuccessData?.documentId}`)}
              className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25"
            >
              Open Document Details <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-8 text-xs text-slate-500 bg-[#090d16]">Loading document editor...</div>}>
      <NewDocumentContent />
    </Suspense>
  );
}

