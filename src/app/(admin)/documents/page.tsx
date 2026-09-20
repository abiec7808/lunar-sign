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

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch('/api/documents');
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          setDocuments(
            data.documents.map((d: any) => ({
              id: d.id,
              title: d.title,
              recipients: [
                { name: `${d.signed_recipients || 0} of ${d.total_recipients || 1} Signed`, email: '', status: d.status === 'completed' ? 'signed' : 'opened' },
              ],
              status: d.status,
              page_count: d.page_count || 1,
              created_at: d.created_at,
              completed_at: d.completed_at,
            }))
          );
        } else {
          setDocuments(mockDocuments);
        }
      } catch (err) {
        console.error('Failed to load documents from database:', err);
        setDocuments(mockDocuments);
      } finally {
        setIsLoading(false);
      }
    }
    loadDocuments();
  }, []);

  const mockDocuments = [
    {
      id: 'doc-001',
      title: 'Standard Service Level Agreement (SLA) 2026',
      recipients: [
        { name: 'Johan Van Der Merwe', email: 'johan@example.co.za', status: 'signed' },
        { name: 'Sarah Jenkins', email: 'sarah@example.co.za', status: 'signed' },
      ],
      status: 'completed',
      page_count: 2,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    },
    {
      id: 'doc-002',
      title: 'Commercial Master Equipment Lease Agreement',
      recipients: [
        { name: 'Thabo Mokoena', email: 'thabo@example.co.za', status: 'signed' },
        { name: 'Pieter Botha', email: 'pieter@example.co.za', status: 'opened' },
      ],
      status: 'partially_signed',
      page_count: 4,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      completed_at: null,
    },
    {
      id: 'doc-003',
      title: 'Non-Disclosure & Confidentiality Agreement (NDA)',
      recipients: [
        { name: 'Sarah Jenkins', email: 'sarah@example.co.za', status: 'pending' },
      ],
      status: 'sent',
      page_count: 1,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      completed_at: null,
    },
    {
      id: 'doc-004',
      title: 'Consulting Retainer Services Terms',
      recipients: [
        { name: 'David Smith', email: 'david@example.co.za', status: 'declined' },
      ],
      status: 'voided',
      page_count: 3,
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      completed_at: null,
    },
  ];

  const displayDocs = documents.length > 0 ? documents : mockDocuments;

  const filteredDocs = displayDocs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.recipients &&
        doc.recipients.some(
          (r: any) =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.email.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
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
        title="Documents & Envelopes"
        subtitle="Track document statuses, send reminders, void envelopes, and download executed certificates."
        actionButton={
          <Button
            onClick={() => setIsEctaModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Envelope
          </Button>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <Input
              placeholder="Search by title, signer name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-900/80 border-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'sent', 'partially_signed', 'completed', 'voided'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Bar if items selected */}
        {selectedDocIds.length > 0 && (
          <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl flex items-center justify-between animate-in fade-in-0 duration-150">
            <span className="text-xs text-indigo-200 font-semibold pl-2">
              {selectedDocIds.length} document(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8">
                <Bell className="w-3.5 h-3.5 mr-1" /> Send Reminders
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-8">
                <Download className="w-3.5 h-3.5 mr-1" /> Download Selected
              </Button>
              <Button variant="destructive" size="sm" className="text-xs h-8">
                <Ban className="w-3.5 h-3.5 mr-1" /> Void Selected
              </Button>
            </div>
          </div>
        )}

        {/* Documents Table Card */}
        <Card className="bg-slate-900/60 border-slate-800">
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
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.map((doc) => (
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
                            <Link href={`/documents/${doc.id}`} className="font-semibold text-slate-100 hover:text-indigo-400 transition-colors block">
                              {doc.title}
                            </Link>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {doc.page_count} Pages • ID: {doc.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {doc.recipients?.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  r.status === 'signed'
                                    ? 'bg-emerald-400'
                                    : r.status === 'opened'
                                    ? 'bg-amber-400'
                                    : r.status === 'declined'
                                    ? 'bg-red-400'
                                    : 'bg-slate-600'
                                }`}
                              />
                              <span className="truncate max-w-[160px]">{r.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {doc.status === 'completed' && <Badge variant="success">Completed</Badge>}
                        {doc.status === 'partially_signed' && <Badge variant="warning">Partially Signed</Badge>}
                        {doc.status === 'sent' && <Badge variant="default">Sent</Badge>}
                        {doc.status === 'voided' && <Badge variant="destructive">Voided</Badge>}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-400">
                        {formatSaDate(doc.created_at)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="outline" size="sm" className="text-xs h-8">
                              Manage <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <EctaExclusionsModal
        isOpen={isEctaModalOpen}
        onClose={() => setIsEctaModalOpen(false)}
        onConfirmCompliance={() => router.push('/documents/new')}
      />
    </div>
  );
}
