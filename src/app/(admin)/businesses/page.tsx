'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ShieldCheck,
  Users,
  FileText,
  AlertTriangle,
  Settings2,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';
import { formatSaDate } from '@/lib/dates';

interface Business {
  id: string;
  name: string;
  slug: string;
  status: 'approved' | 'pending_approval' | 'suspended';
  max_users: number;
  max_documents: number;
  total_users: number;
  total_documents: number;
  admin_name?: string;
  admin_email?: string;
  vat_number?: string;
  company_reg_number?: string;
  phone?: string;
  created_at: string;
}

export default function SuperAdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/super-admin/businesses');
      const data = await res.json();
      if (data.businesses) {
        setBusinesses(data.businesses);
      }
    } catch (err) {
      console.error('Failed to fetch businesses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleUpdateStatus = async (
    id: string,
    status: 'approved' | 'pending_approval' | 'suspended',
    maxUsers?: number,
    maxDocuments?: number
  ) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/super-admin/businesses/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, maxUsers, maxDocuments }),
      });
      if (res.ok) {
        await fetchBusinesses();
      }
    } catch (err) {
      console.error('Failed to update business status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.admin_name && b.admin_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.admin_email && b.admin_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.vat_number && b.vat_number.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = businesses.filter((b) => b.status === 'pending_approval').length;
  const approvedCount = businesses.filter((b) => b.status === 'approved').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Super Admin • Registered Businesses"
        subtitle="Approve new enterprise signups, manage multi-tenant permissions, and adjust document/user limits."
        actionButton={
          <Button
            onClick={fetchBusinesses}
            variant="outline"
            size="sm"
            className="text-xs border-slate-700 bg-slate-900 text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh List
          </Button>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400">Total Registered</span>
                <h3 className="text-2xl font-bold text-white mt-1">{businesses.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/70 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Pending Approval
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">{pendingCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/70 border-slate-800">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved & Active
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">{approvedCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <Input
              placeholder="Search by business name, admin, VAT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-900/80 border-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['all', 'pending_approval', 'approved', 'suspended'].map((status) => (
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

        {/* Businesses Table Card */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Business & Legal Name</th>
                    <th className="py-3 px-4">Admin Contact</th>
                    <th className="py-3 px-4">Usage Limits</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        {isLoading ? 'Loading businesses from database...' : 'No businesses match the criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-300 font-bold shrink-0 mt-0.5">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100 text-sm">{b.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                {b.vat_number && <span>VAT: {b.vat_number}</span>}
                                {b.company_reg_number && <span>Reg: {b.company_reg_number}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-xs text-slate-200 font-medium">{b.admin_name || 'Administrator'}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 text-slate-500" /> {b.admin_email}
                          </div>
                          {b.phone && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {b.phone}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Users className="w-3.5 h-3.5 text-indigo-400" />
                              <span>
                                {b.total_users || 1} / {b.max_users || 5} Users
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <FileText className="w-3.5 h-3.5 text-cyan-400" />
                              <span>
                                {b.total_documents || 0} / {b.max_documents || 10} Envelopes
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {b.status === 'approved' && (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </Badge>
                          )}
                          {b.status === 'pending_approval' && (
                            <Badge variant="warning" className="gap-1">
                              <Clock className="w-3 h-3" /> Pending Review
                            </Badge>
                          )}
                          {b.status === 'suspended' && (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" /> Suspended
                            </Badge>
                          )}
                        </td>

                        <td className="py-4 px-4 text-xs font-mono text-slate-400">
                          {formatSaDate(b.created_at)}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {b.status === 'pending_approval' ? (
                              <Button
                                size="sm"
                                disabled={actionLoadingId === b.id}
                                onClick={() => handleUpdateStatus(b.id, 'approved')}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 shadow-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve Business
                              </Button>
                            ) : b.status === 'approved' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoadingId === b.id}
                                onClick={() => handleUpdateStatus(b.id, 'suspended')}
                                className="text-xs h-8 text-amber-400 border-amber-500/40 hover:bg-amber-950/40"
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoadingId === b.id}
                                onClick={() => handleUpdateStatus(b.id, 'approved')}
                                className="text-xs h-8 text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/40"
                              >
                                Re-Activate
                              </Button>
                            )}
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
      </div>
    </div>
  );
}
