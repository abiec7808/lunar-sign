'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Bell,
  Ban,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  QrCode,
  ArrowLeft,
  Calendar,
  Lock,
  Users,
  Check,
  Trash2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { formatSaDateTime, formatSaDate } from '@/lib/dates';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = (params?.id as string) || 'doc-001';

  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'recipients'>('overview');
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [document, setDocument] = useState<any>({
    id: docId,
    title: 'Loading Agreement...',
    status: 'sent',
    page_count: 1,
    original_filename: 'agreement.pdf',
    original_hash: '—',
    final_hash: '—',
    is_archived: false,
    created_at: new Date().toISOString(),
    completed_at: null,
  });

  const [recipients, setRecipients] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  const loadDoc = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.document) setDocument(data.document);
        if (data.recipients) setRecipients(data.recipients);
        if (data.auditEvents) setAuditEvents(data.auditEvents);
      }
    } catch (err) {
      console.error('Failed to load document details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDoc();
  }, [docId]);

  const handleCopySigningLink = (token: string, index: number) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLinkIndex(index);
    setTimeout(() => setCopiedLinkIndex(null), 2000);
  };

  const handleArchiveToggle = async (archive: boolean) => {
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: archive ? 'archive' : 'unarchive' }),
      });
      if (res.ok) {
        alert(archive ? 'Document archived for safekeeping & history.' : 'Document restored from archives.');
        await loadDoc();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update archive state');
      }
    } catch (err) {
      console.error('Archive error:', err);
      alert('An error occurred while archiving document.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleVoidEnvelope = async (removePermanently: boolean = true) => {
    const promptMsg = removePermanently
      ? `Are you sure you want to void and remove "${document.title}"? Signers will be notified and this envelope will be removed.`
      : `Are you sure you want to void "${document.title}"?`;

    if (!window.confirm(promptMsg)) return;

    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'void',
          remove: removePermanently,
          reason: 'Voided by business administrator.',
        }),
      });

      if (res.ok) {
        alert(removePermanently ? 'Document successfully voided and removed.' : 'Document voided.');
        router.push('/documents');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to void document');
      }
    } catch (err) {
      console.error('Failed to void document:', err);
      alert('An unexpected error occurred while voiding document.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteEnvelope = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${document.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Document envelope deleted permanently.');
        router.push('/documents');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('An unexpected error occurred while deleting document.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendReminder = async (recipientId?: string) => {
    try {
      setIsActionLoading(true);
      const res = await fetch(`/api/documents/${docId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Reminder email successfully sent!');
      } else {
        alert(data.error || 'Failed to send reminder.');
      }
    } catch (err) {
      console.error('Failed to send reminder:', err);
      alert('An error occurred while dispatching reminder.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const signedCount = recipients.filter((r) => r.status === 'signed').length;
  const totalCount = recipients.length;
  const isAllSigned = signedCount === totalCount && totalCount > 0;
  const progressPct = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title={document.title}
        subtitle={`Envelope ID: ${document.id} • ${document.page_count || 1} Pages • ${signedCount} of ${totalCount} Signatures Collected`}
        actionButton={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href="/documents">
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
            </Link>
            <Link href={`/verify/${document.id}`} target="_blank">
              <Button variant="outline" size="sm" className="text-xs border-cyan-500/40 text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Public Verify
              </Button>
            </Link>
            <a href={`/api/documents/${docId}/download`} target="_blank" download>
              <Button
                variant="default"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/25"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download (PDF)
              </Button>
            </a>
            {isAllSigned && (
              document.is_archived ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActionLoading}
                  onClick={() => handleArchiveToggle(false)}
                  className="text-xs border-cyan-500/40 text-cyan-300 hover:bg-cyan-950/40"
                  title="Restore from historical archives"
                >
                  <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Restore from Archive
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActionLoading}
                  onClick={() => handleArchiveToggle(true)}
                  className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40"
                  title="Archive signed document for history"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" /> Move to Archive
                </Button>
              )
            )}
            {!isAllSigned && document.status !== 'voided' && (
              <Button
                variant="outline"
                size="sm"
                disabled={isActionLoading}
                onClick={() => handleSendReminder()}
                className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-950/40"
                title="Send reminder email to all pending signers"
              >
                <Bell className="w-3.5 h-3.5 mr-1" /> Remind Signers
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={isActionLoading}
              onClick={() => handleVoidEnvelope(true)}
              className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-950/40"
              title="Void and remove envelope"
            >
              <Ban className="w-3.5 h-3.5 mr-1" /> Void & Remove
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isActionLoading}
              onClick={handleDeleteEnvelope}
              className="text-xs bg-red-600 hover:bg-red-500"
              title="Permanently delete envelope"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </div>
        }
      />


      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Safekeeping & Archival Reminder Banner when signed */}
        {isAllSigned && (
          <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Signed Document Ready for Safekeeping</h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  All parties have completed their signatures. Please download and preserve the finalized PDF for your permanent business records.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/api/documents/${docId}/download`} target="_blank" download>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold shadow-md shadow-emerald-600/30 text-white">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download for Safekeeping
                </Button>
              </a>
              {!document.is_archived && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleArchiveToggle(true)}
                  className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40"
                >
                  <Archive className="w-3.5 h-3.5 mr-1" /> Archive Envelope
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Progress & Status Card */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isAllSigned
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400'
              }`}
            >
              {isAllSigned ? <CheckCircle2 className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAllSigned ? 'Envelope Fully Executed & Sealed' : 'Signing In Progress'}
                </h3>
                {document.is_archived && (
                  <Badge variant="outline" className="bg-slate-800 text-cyan-300 border-cyan-500/30 text-[10px]">
                    📁 Archived
                  </Badge>
                )}
                {isAllSigned ? (
                  <Badge variant="success">Completed</Badge>
                ) : (
                  <Badge variant="default">{signedCount} of {totalCount} Signed</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Created: {formatSaDateTime(document.created_at)} • South African ECTA 25 of 2002 Compliant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-48 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-right">
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="overview" className="text-xs">
              Overview & Integrity
            </TabsTrigger>
            <TabsTrigger value="recipients" className="text-xs">
              Signatories & Members ({recipients.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs">
              Audit Trail ({auditEvents.length})
            </TabsTrigger>
          </TabsList>

          {/* 1. OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white">Cryptographic Hashes & Integrity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Original File Hash (SHA-256):</span>
                    <span className="font-mono text-[11px] text-slate-200 bg-slate-950 p-2 rounded block border border-slate-800 break-all">
                      {document.original_hash || 'SHA-256 Hash Generated on Initialization'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Final Executed Hash (SHA-256):</span>
                    <span className="font-mono text-[11px] text-emerald-400 bg-slate-950 p-2 rounded block border border-slate-800 break-all">
                      {document.final_hash || 'Will be stamped upon completion'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white">Instant Download & Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <p className="text-slate-300">
                    Download the stamped PDF document with individual digital signature approval boxes and the South African ECTA Completion Certificate at any time.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <a href={`/api/documents/${docId}/download`} target="_blank" download className="flex-1">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download Full Signed PDF
                      </Button>
                    </a>
                    <a href={`/api/documents/${docId}/download?type=certificate`} target="_blank" download className="flex-1">
                      <Button variant="outline" className="w-full text-xs border-slate-700">
                        <FileText className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Certificate Only
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 2. RECIPIENTS / SIGNATORIES TAB */}
          <TabsContent value="recipients" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipients.map((r, i) => (
                <Card key={r.id || i} className="bg-slate-900/60 border-slate-800">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          #{i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">{r.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{r.email}</div>
                        </div>
                      </div>
                      <Badge variant={r.status === 'signed' ? 'success' : 'default'}>
                        {r.status === 'signed' ? 'Signed' : 'Pending Signature'}
                      </Badge>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Role:</span>
                        <span className="font-semibold text-slate-200 capitalize">{r.role || 'Signer'}</span>
                      </div>
                      {r.phone && (
                        <div className="flex justify-between text-slate-400">
                          <span>Phone:</span>
                          <span className="font-mono text-slate-200">{r.phone}</span>
                        </div>
                      )}
                      {r.signed_at && (
                        <div className="flex justify-between text-slate-400">
                          <span>Signed Date:</span>
                          <span className="text-emerald-400 font-mono">{formatSaDateTime(r.signed_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      {r.status !== 'signed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendReminder(r.id)}
                          disabled={isActionLoading}
                          className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-950/30 h-7"
                        >
                          <Bell className="w-3 h-3 mr-1" /> Send Reminder
                        </Button>
                      )}
                      {r.token && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopySigningLink(r.token, i)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 h-7 ml-auto"
                        >
                          {copiedLinkIndex === i ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Copied!
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Copy className="w-3 h-3" /> Copy Link
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 3. AUDIT TRAIL TAB */}
          <TabsContent value="audit" className="space-y-4 pt-2">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-6">Timestamp (SAST)</th>
                        <th className="py-3 px-6">Event Type</th>
                        <th className="py-3 px-6">Description</th>
                        <th className="py-3 px-6">IP / Actor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {auditEvents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            No audit trail recorded yet.
                          </td>
                        </tr>
                      ) : (
                        auditEvents.map((ev, i) => (
                          <tr key={ev.id || i} className="hover:bg-slate-800/30">
                            <td className="py-3 px-6 font-mono text-slate-300">
                              {formatSaDateTime(ev.created_at)}
                            </td>
                            <td className="py-3 px-6">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {ev.event_type}
                              </Badge>
                            </td>
                            <td className="py-3 px-6 text-slate-200">{ev.description}</td>
                            <td className="py-3 px-6 font-mono text-slate-400 text-[11px]">
                              {ev.ip_address || ev.actor_type || 'System'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
