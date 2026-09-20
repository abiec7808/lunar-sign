'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { formatSaDate } from '@/lib/dates';
import { EctaExclusionsModal } from '@/components/admin/EctaExclusionsModal';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [isEctaModalOpen, setIsEctaModalOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        }
      } catch (err) {
        console.error('Failed to load documents:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute live metrics from company documents
  const totalEnvelopes = documents.length;
  const awaitingOthers = documents.filter((d) => d.status === 'sent' || d.status === 'partially_signed').length;
  const completed = documents.filter((d) => d.status === 'completed').length;
  const completionRate = totalEnvelopes > 0 ? `${Math.round((completed / totalEnvelopes) * 100)}%` : '0%';
  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Dashboard Overview"
        subtitle="Manage electronic signatures, live signing tracking, and legal compliance."
        actionButton={
          <Button
            onClick={() => setIsEctaModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Document
          </Button>
        }
      />

      <div className="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Envelopes
              </CardTitle>
              <FileText className="w-4 h-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalEnvelopes}</div>
              <p className="text-[11px] text-slate-400 mt-1">Tenant document volume</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Awaiting Others
              </CardTitle>
              <Clock className="w-4 h-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{awaitingOthers}</div>
              <p className="text-[11px] text-slate-400 mt-1">Pending recipient completion</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Completed
              </CardTitle>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{completed}</div>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">Fully executed & sealed</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Completion Rate
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{completionRate}</div>
              <p className="text-[11px] text-slate-400 mt-1">Execution efficiency</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Envelopes Table Card */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-white">Recent Envelopes</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Live tracking of ongoing and executed agreements</p>
            </div>
            {documents.length > 0 && (
              <Link href="/documents">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-400 hover:text-indigo-300">
                  View All <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-xs text-slate-500">Loading envelopes...</div>
            ) : documents.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">No Envelopes Created Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Your business account is clean and ready. Upload your first PDF to place signature placeholders and send to clients.
                </p>
                <Button
                  onClick={() => setIsEctaModalOpen(true)}
                  className="mt-5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Create First Envelope
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-6">Document</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Signers</th>
                      <th className="py-3 px-6">Date Created</th>
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-6 font-medium text-slate-200">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="truncate max-w-xs">{doc.title}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {doc.status === 'completed' && (
                            <Badge variant="success">Completed</Badge>
                          )}
                          {doc.status === 'partially_signed' && (
                            <Badge variant="warning">Partially Signed</Badge>
                          )}
                          {doc.status === 'sent' && (
                            <Badge variant="default">Sent</Badge>
                          )}
                          {doc.status === 'draft' && (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs font-mono text-slate-300">
                          {doc.signed_recipients || 0} / {doc.total_recipients || 1}
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                          {formatSaDate(doc.created_at)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="outline" size="sm" className="text-xs h-8">
                              View Envelope
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ECTA Exclusions Verification Modal */}
      <EctaExclusionsModal
        isOpen={isEctaModalOpen}
        onClose={() => setIsEctaModalOpen(false)}
        onConfirmCompliance={() => router.push('/documents/new')}
      />
    </div>
  );
}
