'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { formatSaDateTime } from '@/lib/dates';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const docId = (params?.id as string) || 'doc-001';

  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'recipients'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);

  // Mock Document Model
  const document = {
    id: docId,
    title: 'Standard South African Service Level Agreement (SLA)',
    status: 'completed',
    page_count: 2,
    original_filename: 'standard_sla_2026.pdf',
    original_hash: 'a68c92a912e9b0849318b76c8c49e776e03881df3e04e93014a40026e6951234',
    final_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    recipients: [
      {
        id: 'r-1',
        name: 'Johan Van Der Merwe',
        email: 'johan@example.co.za',
        role: 'signer',
        status: 'signed',
        auth_method: 'none',
        opened_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        signed_at: new Date(Date.now() - 3600000 * 16).toISOString(),
        ip_address: '105.213.44.12 (Cape Town, ZA)',
        token: 'sample_token_johan_123',
      },
      {
        id: 'r-2',
        name: 'Sarah Jenkins',
        email: 'sarah@example.co.za',
        role: 'signer',
        status: 'signed',
        auth_method: 'access_code',
        opened_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        signed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        ip_address: '197.97.100.88 (George, ZA)',
        token: 'sample_token_sarah_456',
      },
    ],
    audit_events: [
      {
        id: 'ev-1',
        event_type: 'document.created',
        description: 'Document uploaded and initialized by Lunar Admin.',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        actor: 'Admin',
      },
      {
        id: 'ev-2',
        event_type: 'document.sent',
        description: 'Signing links dispatched via Resend transactional service.',
        created_at: new Date(Date.now() - 3600000 * 23).toISOString(),
        actor: 'System',
      },
      {
        id: 'ev-3',
        event_type: 'document.opened',
        description: 'Signer Johan Van Der Merwe accessed signing URL.',
        created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        actor: 'johan@example.co.za',
      },
      {
        id: 'ev-4',
        event_type: 'signature.affixed',
        description: 'Johan Van Der Merwe gave ECTA consent and affixed signature.',
        created_at: new Date(Date.now() - 3600000 * 16).toISOString(),
        actor: 'johan@example.co.za',
      },
      {
        id: 'ev-5',
        event_type: 'document.completed',
        description: 'All signers signed. PDF flattened, SHA-256 sealed, and ECTA certificate generated.',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        actor: 'System',
      },
    ],
  };

  const handleCopySigningLink = (token: string) => {
    const url = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title={document.title}
        subtitle={`Envelope ID: ${document.id} • ${document.page_count} Pages`}
        actionButton={
          <div className="flex items-center gap-2">
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
            <Button
              variant="default"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Signed PDF & Certificate
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Status Bar */}
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Envelope Execution Completed</h3>
                <Badge variant="success">Fully Signed & Sealed</Badge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Completed on: {formatSaDateTime(document.completed_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Bell className="w-3.5 h-3.5 mr-1" /> Send Notification
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-red-400 hover:bg-red-950/40 border-red-900">
              <Ban className="w-3.5 h-3.5 mr-1" /> Void Envelope
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-slate-950 border-slate-800">
            <TabsTrigger value="overview">Overview & Integrity</TabsTrigger>
            <TabsTrigger value="recipients">Signatories ({document.recipients.length})</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail ({document.audit_events.length})</TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Document Metadata Card */}
              <Card className="lg:col-span-2 bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white">Cryptographic Hashes & Integrity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Original Upload SHA-256 Hash
                    </span>
                    <code className="text-xs text-slate-300 font-mono break-all">{document.original_hash}</code>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-xl border border-emerald-900/40 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Final Tamper-Evident SHA-256 Hash
                    </span>
                    <code className="text-xs text-emerald-300 font-mono break-all">{document.final_hash}</code>
                  </div>

                  <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1 leading-relaxed">
                    <div className="font-bold text-slate-200">South African ECTA 25 of 2002 Legal Force:</div>
                    Under Section 11 and Section 15 of the Electronic Communications and Transactions Act, this electronic
                    record holds full legal recognition and evidential presumption of integrity.
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="bg-slate-900/60 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-white">Public Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                  <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl shadow-lg flex items-center justify-center">
                    <QrCode className="w-28 h-28 text-slate-900" />
                  </div>
                  <p className="text-xs text-slate-400">
                    Scan or visit the public verification portal to inspect tamper evidence.
                  </p>
                  <Link href={`/verify/${document.id}`} target="_blank" className="block">
                    <Button variant="outline" size="sm" className="w-full text-xs border-slate-700">
                      Open Verification Portal <ExternalLink className="w-3 h-3 ml-1.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: RECIPIENTS */}
          <TabsContent value="recipients" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {document.recipients.map((r, i) => (
                <Card key={r.id} className="bg-slate-900/60 border-slate-800">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm text-white font-bold">{r.name}</CardTitle>
                      <p className="text-xs text-slate-400 font-mono">{r.email}</p>
                    </div>
                    <Badge variant={r.status === 'signed' ? 'success' : 'default'}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-slate-400">
                        Role: <strong className="text-slate-200">{r.role}</strong>
                      </div>
                      <div className="text-slate-400">
                        Auth Method: <strong className="text-slate-200">{r.auth_method}</strong>
                      </div>
                      <div className="text-slate-400">
                        Signed: <strong className="text-emerald-400 font-mono">{formatSaDateTime(r.signed_at)}</strong>
                      </div>
                      <div className="text-slate-400 font-mono">
                        IP: <span className="text-slate-300">{r.ip_address}</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopySigningLink(r.token)}
                      className="w-full text-xs text-indigo-400 hover:text-indigo-300 border border-slate-800"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      {copiedLink ? 'Signing Link Copied!' : 'Copy Secure Signing Link'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 3: AUDIT TRAIL */}
          <TabsContent value="audit" className="space-y-4 pt-4">
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-sm text-white font-bold">
                  Immutable Cryptographic Audit Trail (Append-Only)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800/60">
                  {document.audit_events.map((ev) => (
                    <div key={ev.id} className="p-4 flex items-start gap-3 hover:bg-slate-800/20">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 font-mono">{ev.event_type}</span>
                          <span className="text-slate-500 font-mono">{formatSaDateTime(ev.created_at)}</span>
                        </div>
                        <p className="text-slate-400 mt-1">{ev.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono">Actor: {ev.actor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
