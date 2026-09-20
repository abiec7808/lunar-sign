'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
} from 'lucide-react';
import { formatSaDate } from '@/lib/dates';
import { EctaExclusionsModal } from '@/components/admin/EctaExclusionsModal';

export default function DocumentsListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isEctaModalOpen, setIsEctaModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    loadDocuments();
  }, []);

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

  const handleBulkArchive = async (archive: boolean) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          action: archive ? 'archive' : 'unarchive',
        }),
      });
      if (res.ok) {
        setNotification(
          archive
            ? `Successfully archived ${selectedDocIds.length} document(s).`
            : `Successfully restored ${selectedDocIds.length} document(s).`
        );
        setSelectedDocIds([]);
        setTimeout(() => setNotification(null), 4000);
        await loadDocuments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to archive documents');
      }
    } catch (err) {
      console.error('Bulk archive error:', err);
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action: 'void_remove' | 'delete') => {
    const isVoid = action === 'void_remove';
    const confirmMessage = isVoid
      ? `Are you sure you want to void and remove ${selectedDocIds.length} selected document(s)? Signatories will be notified and links invalidated.`
      : `Are you sure you want to permanently delete ${selectedDocIds.length} selected document(s)? This cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

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
      return false; // Hide archived docs in active tabs
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
          <Button
            onClick={() => setIsEctaModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Document
          </Button>
        }
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {notification && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in-0">
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
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Bar if items selected */}
        {selectedDocIds.length > 0 && (
          <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in-0 duration-150">
            <span className="text-xs text-indigo-200 font-semibold pl-2">
              {selectedDocIds.length} document(s) selected
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilter === 'archived' ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleBulkArchive(false)}
                  className="text-xs h-8 border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
                >
                  <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Restore from Archive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleBulkArchive(true)}
                  className="text-xs h-8 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" /> Move to Archives
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleBulkAction('void_remove')}
                className="text-xs h-8 bg-amber-600/80 hover:bg-amber-600 text-white border border-amber-500/40"
              >
                <Ban className="w-3.5 h-3.5 mr-1" /> Void & Remove Selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleBulkAction('delete')}
                className="text-xs h-8 bg-red-600 hover:bg-red-500"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Permanently
              </Button>
            </div>
          </div>
        )}

        {/* Documents Table or Clean Empty State */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">Loading document envelopes...</div>
        ) : documents.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800 text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Document Envelopes Found</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Your company account has 0 envelopes. Create your first agreement to place signature placeholders and dispatch secure signing links.
            </p>
            <Button
              onClick={() => setIsEctaModalOpen(true)}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create First Envelope
            </Button>
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-10">
                        <Checkbox
                          checked={selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Signatories</th>
                      <th className="py-3 px-4">Status & Safekeeping</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                          {statusFilter === 'archived'
                            ? 'No archived documents yet. Completed envelopes can be archived for safekeeping.'
                            : 'No documents matched your filters.'}
                        </td>
                      </tr>
                    ) : (
                      filteredDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-4">
                            <Checkbox
                              checked={selectedDocIds.includes(doc.id)}
                              onCheckedChange={() => toggleSelectDoc(doc.id)}
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                              <div>
                                <Link
                                  href={`/documents/${doc.id}`}
                                  className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors block"
                                >
                                  {doc.title}
                                </Link>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {doc.page_count} Pages • ID: {doc.id}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1.5">
                              {doc.recipients?.map((r: any, i: number) => {
                                const recipIdentifier = r.id || doc.id;
                                const isCopied = copiedRecipientId === recipIdentifier;
                                return (
                                  <div key={i} className="flex items-center justify-between gap-2 text-xs text-slate-300 bg-slate-950/40 px-2 py-1 rounded-lg border border-slate-800/60 max-w-[280px]">
                                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          r.status === 'signed'
                                            ? 'bg-emerald-400'
                                            : r.status === 'opened'
                                            ? 'bg-amber-400'
                                            : r.status === 'declined'
                                            ? 'bg-red-400'
                                            : 'bg-indigo-400'
                                        }`}
                                      />
                                      <span className="truncate font-medium text-slate-200" title={r.email ? `${r.name} (${r.email})` : r.name}>
                                        {r.name}
                                      </span>
                                    </div>
                                    
                                    {r.status !== 'signed' && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopySigningLink(recipIdentifier, doc.title, e)}
                                          title="Copy direct signing link for this client"
                                          className={`p-1 rounded transition-colors ${
                                            isCopied
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : 'hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300'
                                          }`}
                                        >
                                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleWhatsAppShare(recipIdentifier, doc.title, r.name, e)}
                                          title="Share signing link via WhatsApp"
                                          className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {doc.is_archived && (
                                <Badge variant="outline" className="bg-slate-800 text-cyan-300 border-cyan-500/30 text-[10px]">
                                  📁 Archived
                                </Badge>
                              )}
                              {doc.status === 'completed' && <Badge variant="success">Completed</Badge>}
                              {doc.status === 'partially_signed' && <Badge variant="warning">Partially Signed</Badge>}
                              {doc.status === 'sent' && <Badge variant="default">Sent</Badge>}
                              {doc.status === 'draft' && <Badge variant="secondary">Draft</Badge>}
                              {doc.status === 'voided' && <Badge variant="destructive">Voided</Badge>}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs font-mono text-slate-400">
                            {formatSaDate(doc.created_at)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {doc.status !== 'completed' && doc.status !== 'voided' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    const firstPending = doc.recipients?.find((r: any) => r.status !== 'signed');
                                    handleCopySigningLink(firstPending?.id || doc.id, doc.title, e);
                                  }}
                                  title="Copy signing link to share with client"
                                  className="text-xs h-7 px-2 border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                                >
                                  <Copy className="w-3 h-3 mr-1" /> Copy Link
                                </Button>
                              )}
                              {(doc.status === 'completed' || doc.is_archived) && (
                                <a
                                  href={`/api/documents/${doc.id}/download`}
                                  target="_blank"
                                  download
                                  title="Download Signed PDF for Safekeeping"
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7 px-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                                  >
                                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                                  </Button>
                                </a>
                              )}

                              <Link href={`/documents/${doc.id}`}>
                                <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                                  Manage <ExternalLink className="w-3 h-3 ml-1" />
                                </Button>
                              </Link>

                              {doc.is_archived ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleArchiveToggle(doc.id, doc.title, false)}
                                  title="Restore from Archives"
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <EctaExclusionsModal
        isOpen={isEctaModalOpen}
        onClose={() => setIsEctaModalOpen(false)}
        onConfirmCompliance={() => router.push('/documents/new')}
      />
    </div>
  );
}

