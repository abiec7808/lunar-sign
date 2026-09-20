'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Send,
  Download,
  Trash2,
  Bell,
  Ban,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Archive,
  ArchiveRestore,
  ShieldCheck,
  Link2,
  Copy,
  Check,
  MessageCircle,
  Layers,
  Sparkles,
  UserPlus,
  Users,
  BookOpen,
  ArrowRight,
  LayoutTemplate,
} from 'lucide-react';
import { formatSaDate } from '@/lib/dates';
import { EctaExclusionsModal } from '@/components/admin/EctaExclusionsModal';
import { getRecipientColor } from '@/lib/utils';

export default function DocumentsListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isEctaModalOpen, setIsEctaModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Template Quick Dispatch State from Documents Tab
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateDocTitle, setTemplateDocTitle] = useState('');
  const [templateDocMessage, setTemplateDocMessage] = useState('Please review and sign this agreement.');
  const [templateSigningOrder, setTemplateSigningOrder] = useState(false);
  const [templateSigners, setTemplateSigners] = useState<
    Array<{ name: string; email: string; phone: string; role: string; authMethod: string }>
  >([]);
  const [isDispatchingTemplate, setIsDispatchingTemplate] = useState(false);
  const [addressBook, setAddressBook] = useState<any[]>([]);
  const [isAddressBookOpen, setIsAddressBookOpen] = useState(false);
  const [activeSignerPickIndex, setActiveSignerPickIndex] = useState<number | null>(null);

  // Post-send success modal
  const [directSuccessData, setDirectSuccessData] = useState<any | null>(null);
  const [copiedSuccessIndex, setCopiedSuccessIndex] = useState<number | null>(null);

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(
          (data.documents || []).map((d: any) => {
            const parsedRecips = Array.isArray(d.recipients_list) && d.recipients_list.length > 0
              ? d.recipients_list
              : [
                  {
                    name: `${d.signed_recipients || 0} of ${d.total_recipients || 1} Signed`,
                    email: '',
                    status: d.status === 'completed' ? 'signed' : 'opened',
                  },
                ];

            return {
              id: d.id,
              title: d.title,
              recipients: parsedRecips,
              signed_count: d.signed_recipients || 0,
              total_count: d.total_recipients || parsedRecips.length || 1,
              status: d.status,
              is_archived: !!d.is_archived,
              archived_at: d.archived_at,
              page_count: d.page_count || 1,
              created_at: d.created_at,
              completed_at: d.completed_at,
            };
          })
        );
      }
    } catch (err) {
      console.error('Failed to load documents from database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplatesAndContacts = async () => {
    try {
      const [tplRes, contRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/contacts'),
      ]);
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplatesList(tplData.templates || []);
      }
      if (contRes.ok) {
        const contData = await contRes.json();
        setAddressBook(contData.contacts || []);
      }
    } catch (e) {
      console.error('Error fetching templates/contacts:', e);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadTemplatesAndContacts();
  }, []);

  const handleSelectTemplate = (tpl: any) => {
    setSelectedTemplate(tpl);
    setTemplateDocTitle(tpl.name || 'Contract Agreement');
    setTemplateDocMessage(tpl.description || 'Please review and sign this agreement.');

    let parsedRoles: any[] = [];
    try {
      const r = typeof tpl.recipient_roles === 'string' ? JSON.parse(tpl.recipient_roles) : tpl.recipient_roles;
      if (Array.isArray(r) && r.length > 0) parsedRoles = r;
    } catch (e) {}

    if (parsedRoles.length > 0) {
      setTemplateSigners(
        parsedRoles.map((roleObj: any, i: number) => ({
          name: '',
          email: '',
          phone: '',
          role: roleObj.role || 'signer',
          authMethod: roleObj.authMethod || 'none',
        }))
      );
    } else {
      setTemplateSigners([
        {
          name: '',
          email: '',
          phone: '',
          role: 'signer',
          authMethod: 'none',
        },
      ]);
    }
  };

  const handleDispatchTemplateEmail = async () => {
    if (!selectedTemplate) return;
    if (!templateDocTitle.trim()) {
      alert('Please enter a document title.');
      return;
    }

    const invalidSigner = templateSigners.find((s) => !s.email || !s.email.includes('@'));
    if (invalidSigner) {
      alert('Please enter a valid email address for each client signatory.');
      return;
    }

    try {
      setIsDispatchingTemplate(true);

      let defs: any = selectedTemplate.field_definitions;
      if (typeof defs === 'string') {
        try { defs = JSON.parse(defs); } catch (e) {}
      }

      const rawFields = Array.isArray(defs?.fields) ? defs.fields : Array.isArray(defs) ? defs : [];
      const base64Content = selectedTemplate.pdf_base64 || defs?.fileBase64 || defs?.pdfBase64 || '';

      const payload = {
        title: templateDocTitle.trim(),
        message: templateDocMessage.trim(),
        originalFilename: defs?.originalFilename || `${templateDocTitle.trim().replace(/\s+/g, '_')}.pdf`,
        mimeType: 'application/pdf',
        fileBase64: base64Content,
        signingOrderEnforced: templateSigningOrder,
        recipients: templateSigners.map((s, i) => ({
          name: s.name.trim() || s.email.trim(),
          email: s.email.trim().toLowerCase(),
          phone: s.phone ? s.phone.trim() : '',
          role: s.role || 'signer',
          authMethod: s.authMethod || 'none',
          orderIndex: i,
        })),
        fields: rawFields.map((f: any) => {
          let rIndex: number | null = 0;
          if (f.recipientIndex !== undefined && f.recipientIndex !== null) {
            rIndex = f.recipientIndex;
          } else if (f.recipient_id === null) {
            rIndex = null;
          }
          return {
            type: f.type,
            page: Number(f.page) || 1,
            x_pct: Number(f.x_pct),
            y_pct: Number(f.y_pct),
            width_pct: Number(f.width_pct),
            height_pct: Number(f.height_pct),
            required: f.required !== false,
            label: f.label || f.type,
            placeholder: f.placeholder || '',
            value: f.value || f.default_value || undefined,
            recipientIndex: rIndex,
          };
        }),
      };

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.documentId) {
        setIsTemplateModalOpen(false);
        setSelectedTemplate(null);
        setDirectSuccessData(data);
        await loadDocuments();
      } else {
        alert(data.error || 'Failed to dispatch template envelope.');
      }
    } catch (err: any) {
      console.error('Error dispatching template document:', err);
      alert(err?.message || 'An error occurred while dispatching envelope.');
    } finally {
      setIsDispatchingTemplate(false);
    }
  };

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [copiedRecipientId, setCopiedRecipientId] = useState<string | null>(null);

  const handleCopySigningLink = (recipientIdOrDocId: string, docTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lunar-sign.netlify.app';
    const url = `${origin}/s/${recipientIdOrDocId}`;
    navigator.clipboard.writeText(url);
    setCopiedRecipientId(recipientIdOrDocId);
    setNotification(`📋 Copied signing link for "${docTitle}"! You can now share it directly.`);
    setTimeout(() => {
      setCopiedRecipientId(null);
      setNotification(null);
    }, 4000);
  };

  const handleWhatsAppShare = (recipientIdOrDocId: string, docTitle: string, signerName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lunar-sign.netlify.app';
    const url = `${origin}/s/${recipientIdOrDocId}`;
    const text = encodeURIComponent(`Hello${signerName ? ' ' + signerName : ''}, please review and sign "${docTitle}" electronically here: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleArchiveToggle = async (id: string, title: string, archive: boolean) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: archive ? 'archive' : 'unarchive' }),
      });
      if (res.ok) {
        setNotification(
          archive
            ? `Document "${title}" archived for historical safekeeping.`
            : `Document "${title}" restored from archives.`
        );
        setTimeout(() => setNotification(null), 4000);
        await loadDocuments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update archive state');
      }
    } catch (err) {
      console.error('Archive action error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (isVoid: boolean = false) => {
    if (selectedDocIds.length === 0) return;
    const actionText = isVoid ? 'void and remove' : 'permanently delete';
    if (!window.confirm(`Are you sure you want to ${actionText} ${selectedDocIds.length} document(s)?`)) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          action: isVoid ? 'void_remove' : 'delete',
          reason: 'Voided and removed by administrator via dashboard',
        }),
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => !selectedDocIds.includes(d.id)));
        setSelectedDocIds([]);
        setNotification(
          isVoid
            ? `Successfully voided and removed selected documents.`
            : `Successfully deleted selected documents.`
        );
        setTimeout(() => setNotification(null), 4000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to complete action');
      }
    } catch (err) {
      console.error('Error during bulk action:', err);
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleDelete = async (id: string, title: string, isVoid: boolean = false) => {
    const confirmMessage = isVoid
      ? `Are you sure you want to void and remove "${title}"?`
      : `Are you sure you want to permanently delete "${title}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionLoading(true);
      const res = await fetch(`/api/documents/${id}`, {
        method: isVoid ? 'PATCH' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: isVoid ? JSON.stringify({ action: 'void', remove: true }) : undefined,
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setSelectedDocIds((prev) => prev.filter((docId) => docId !== id));
        setNotification(isVoid ? `Document "${title}" voided and removed.` : `Document "${title}" deleted.`);
        setTimeout(() => setNotification(null), 4000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove document');
      }
    } catch (err) {
      console.error('Error removing document:', err);
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.recipients &&
        doc.recipients.some(
          (r: any) =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.email.toLowerCase().includes(searchTerm.toLowerCase())
        ));

    if (statusFilter === 'archived') {
      return matchesSearch && doc.is_archived === true;
    }
    if (doc.is_archived && statusFilter !== 'archived') {
      return false;
    }
    if (statusFilter === 'in_progress') {
      return matchesSearch && (doc.status === 'sent' || doc.status === 'partially_signed');
    }
    if (statusFilter === 'completed') {
      return matchesSearch && doc.status === 'completed';
    }
    if (statusFilter === 'voided') {
      return matchesSearch && doc.status === 'voided';
    }
    return matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map((d) => d.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((d) => d !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Document Envelopes"
        subtitle="Track, execute, and verify tamper-evident contracts and agreements."
        actionButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                loadTemplatesAndContacts();
                setIsTemplateModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 text-xs font-bold text-white"
            >
              <Layers className="w-4 h-4 mr-1.5" /> Send from Template
            </Button>
            <Button
              onClick={() => setIsEctaModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> New Document
            </Button>
          </div>
        }
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {notification && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in-0 shadow-lg">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {/* Top Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <Input
              placeholder="Search by document title or recipient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Active' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'completed', label: 'Completed & Signed' },
              { id: 'archived', label: '📁 Archived History' },
              { id: 'voided', label: 'Voided' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedDocIds.length > 0 && (
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 rounded-xl animate-in fade-in-0">
            <div className="text-xs text-slate-300 font-semibold flex items-center gap-2">
              <Badge className="bg-indigo-600 text-white text-[11px] font-mono">{selectedDocIds.length}</Badge>
              <span>Selected Envelopes</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleBulkAction(true)}
                className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-950/40 font-semibold"
              >
                <Ban className="w-3.5 h-3.5 mr-1" /> Void & Remove Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleBulkAction(false)}
                className="text-xs bg-red-600/90 hover:bg-red-600 text-white font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Document List Table */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">Loading document envelopes from database...</div>
        ) : filteredDocs.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800 text-center py-16 px-4">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No Document Envelopes Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'No documents match your current search and filter criteria.'
                : 'Send your first agreement from a reusable template or create a new envelope from scratch.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                onClick={() => {
                  loadTemplatesAndContacts();
                  setIsTemplateModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
              >
                <Layers className="w-4 h-4 mr-1.5" /> Send from Template
              </Button>
              <Button
                onClick={() => setIsEctaModalOpen(true)}
                variant="outline"
                className="border-slate-700 text-slate-200 text-xs font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Upload New File
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40 text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-10">
                        <Checkbox
                          checked={selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="py-3.5 px-4">Document Title</th>
                      <th className="py-3.5 px-4">Signatories & Direct Links</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Pages</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/documents/${doc.id}`)}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedDocIds.includes(doc.id)}
                            onCheckedChange={() => toggleSelectDoc(doc.id)}
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate max-w-xs group-hover:text-indigo-300 transition-colors">
                                {doc.title}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">ID: {doc.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1.5 max-w-xs">
                            {doc.recipients.map((recip: any, idx: number) => {
                              const tokenOrId = recip.id;
                              const isCopied = copiedRecipientId === tokenOrId;
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-1.5 text-[11px] bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800"
                                >
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        recip.status === 'signed'
                                          ? 'bg-emerald-400'
                                          : recip.status === 'declined'
                                          ? 'bg-red-400'
                                          : 'bg-amber-400 animate-pulse'
                                      }`}
                                    />
                                    <span className="truncate text-slate-200 font-medium">{recip.name || recip.email || `Signer ${idx + 1}`}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleCopySigningLink(tokenOrId, doc.title, e)}
                                      className={`h-5 px-1.5 text-[10px] font-semibold transition-all ${
                                        isCopied
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                          : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/40'
                                      }`}
                                      title="Copy Direct Client Signing Link"
                                    >
                                      {isCopied ? <Check className="w-3 h-3 mr-0.5" /> : <Copy className="w-3 h-3 mr-0.5" />}
                                      {isCopied ? 'Copied' : 'Link'}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleWhatsAppShare(tokenOrId, doc.title, recip.name, e)}
                                      className="h-5 w-5 p-0 text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40"
                                      title="Share via WhatsApp"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold uppercase tracking-wider ${
                              doc.is_archived
                                ? 'bg-slate-800 text-slate-400 border-slate-700'
                                : doc.status === 'completed'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                                : doc.status === 'voided'
                                ? 'bg-red-950/60 text-red-400 border-red-500/40'
                                : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                            }`}
                          >
                            {doc.is_archived ? 'Archived' : doc.status === 'completed' ? 'Completed' : doc.status === 'voided' ? 'Voided' : 'In Progress'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{doc.page_count} pg</td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{formatSaDate(doc.created_at)}</td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/documents/${doc.id}`)}
                              className="text-xs h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
                              title="View Document Details & Audit Trail"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            {doc.is_archived ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveToggle(doc.id, doc.title, false)}
                                title="Restore from archives"
                                className="text-xs h-7 w-7 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                              >
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              </Button>
                            ) : doc.status === 'completed' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveToggle(doc.id, doc.title, true)}
                                title="Archive signed document for history"
                                className="text-xs h-7 w-7 p-0 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                            ) : null}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSingleDelete(doc.id, doc.title, true)}
                              title="Void and remove envelope"
                              className="text-xs h-7 w-7 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSingleDelete(doc.id, doc.title, false)}
                              title="Permanently delete envelope"
                              className="text-xs h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL: Use Template & Generate Client Email Directly From Documents Tab */}
      <Dialog open={isTemplateModalOpen} onOpenChange={(open) => { if (!open) { setIsTemplateModalOpen(false); setSelectedTemplate(null); } }}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Send Document from Template
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a pre-configured template, specify client email(s), and generate invitations immediately.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-4 text-xs">
            {/* 1. Template Picker */}
            <div>
              <Label className="text-xs font-semibold text-slate-300">1. Select Saved Template to Use</Label>
              {templatesList.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center mt-1.5">
                  <p className="text-slate-400 text-xs">No saved templates available yet.</p>
                  <Button
                    size="sm"
                    onClick={() => router.push('/documents/new')}
                    className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-xs"
                  >
                    Create a Template Now
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5 max-h-48 overflow-y-auto pr-1">
                  {templatesList.map((tpl) => {
                    const isSelected = selectedTemplate?.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-200 truncate text-xs">{tpl.name}</strong>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {tpl.description || 'Pre-configured template'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedTemplate && (
              <>
                {/* 2. Custom Title & Message */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-300">
                      2. Custom Document Title <span className="text-indigo-400">(e.g. SLA - CHS, SLA - SPAR)</span>
                    </Label>
                    <Input
                      value={templateDocTitle}
                      onChange={(e) => setTemplateDocTitle(e.target.value)}
                      placeholder="e.g. SLA - CHS"
                      className="mt-1 bg-slate-900 border-slate-700 text-xs font-semibold text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-300">Custom Email Message to Signers</Label>
                    <Input
                      value={templateDocMessage}
                      onChange={(e) => setTemplateDocMessage(e.target.value)}
                      placeholder="Please review and sign this agreement..."
                      className="mt-1 bg-slate-900 border-slate-700 text-xs text-slate-300"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                    <div>
                      <div className="text-xs font-semibold text-slate-300">Sequential Signing Order</div>
                      <div className="text-[11px] text-slate-400">Signer 2 is emailed only after Signer 1 completes signing</div>
                    </div>
                    <Switch checked={templateSigningOrder} onCheckedChange={setTemplateSigningOrder} />
                  </div>
                </div>

                {/* 3. Signatories Input with Address Book Pick */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-300">3. Client Signatories (Email & Details)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTemplateSigners([
                          ...templateSigners,
                          { name: '', email: '', phone: '', role: 'signer', authMethod: 'none' },
                        ]);
                      }}
                      className="h-6 px-2 text-[11px] text-indigo-400 hover:text-indigo-200"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Another Signer
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {templateSigners.map((signer, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                          <span>Signatory #{idx + 1} ({signer.role.toUpperCase()})</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveSignerPickIndex(idx);
                              setIsAddressBookOpen(true);
                            }}
                            className="h-5 px-1.5 text-[10px] text-indigo-400 hover:text-indigo-200"
                          >
                            <BookOpen className="w-3 h-3 mr-1" /> Address Book
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Full Name (e.g. John Doe)"
                            value={signer.name}
                            onChange={(e) => {
                              const updated = [...templateSigners];
                              updated[idx].name = e.target.value;
                              setTemplateSigners(updated);
                            }}
                            className="bg-slate-950 border-slate-700 text-xs"
                          />
                          <Input
                            type="email"
                            placeholder="Email Address (e.g. client@company.com)"
                            value={signer.email}
                            onChange={(e) => {
                              const updated = [...templateSigners];
                              updated[idx].email = e.target.value;
                              setTemplateSigners(updated);
                            }}
                            className="bg-slate-950 border-slate-700 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between border-t border-slate-800 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTemplateModalOpen(false);
                setSelectedTemplate(null);
              }}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancel
            </Button>

            {selectedTemplate && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const title = templateDocTitle.trim() || selectedTemplate.name;
                    const msg = templateDocMessage.trim();
                    router.push(
                      `/documents/new?templateId=${selectedTemplate.id}&title=${encodeURIComponent(title)}&message=${encodeURIComponent(msg)}`
                    );
                  }}
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" /> Customize in Visual Editor
                </Button>
                <Button
                  size="sm"
                  disabled={isDispatchingTemplate}
                  onClick={handleDispatchTemplateEmail}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isDispatchingTemplate ? 'Generating & Dispatching Email...' : 'Send Email to Client'}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Book Modal */}
      <Dialog open={isAddressBookOpen} onOpenChange={setIsAddressBookOpen}>
        <DialogContent className="max-w-md bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Select Contact from Address Book
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
            {addressBook.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No saved contacts yet.</p>
            ) : (
              addressBook.map((contact, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (activeSignerPickIndex !== null && templateSigners[activeSignerPickIndex]) {
                      const updated = [...templateSigners];
                      updated[activeSignerPickIndex].name = contact.name || '';
                      updated[activeSignerPickIndex].email = contact.email || '';
                      updated[activeSignerPickIndex].phone = contact.phone || '';
                      setTemplateSigners(updated);
                    }
                    setIsAddressBookOpen(false);
                  }}
                  className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-slate-200">{contact.name}</strong>
                    <div className="text-[11px] text-slate-400">{contact.email}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-indigo-300">
                    Pick
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Dispatch Success Modal */}
      <Dialog open={!!directSuccessData} onOpenChange={(open) => { if (!open) setDirectSuccessData(null); }}>
        <DialogContent className="max-w-xl bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Envelope Dispatched Successfully! 🚀</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  "{directSuccessData?.title}" was created from your template and emailed to the client.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="text-xs font-semibold text-slate-300">Direct Client Signing Links & Fast Share:</div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {(directSuccessData?.recipients || []).map((r: any, i: number) => {
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
                  const text = encodeURIComponent(`Hello ${r.name}, please review and sign "${directSuccessData.title}" electronically here: ${signingUrl}`);
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

          <DialogFooter className="flex gap-2 border-t border-slate-800 pt-3">
            <Button
              size="sm"
              onClick={() => {
                setDirectSuccessData(null);
                loadDocuments();
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EctaExclusionsModal
        isOpen={isEctaModalOpen}
        onClose={() => setIsEctaModalOpen(false)}
        onConfirmCompliance={() => router.push('/documents/new')}
      />
    </div>
  );
}

