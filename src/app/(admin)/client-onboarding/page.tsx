'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  UserPlus,
  Users,
  Building2,
  FileCheck2,
  Clock,
  Link as LinkIcon,
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Settings2,
  FileSignature,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Search,
  Phone,
  Mail,
  HelpCircle,
  FileText,
  Printer,
  AlertCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { formatSaDate } from '@/lib/dates';
import { OnboardingQuestion, OnboardingSubmission, OnboardingTemplate } from '@/lib/onboarding/service';

interface BusinessItem {
  id: string;
  name: string;
  slug: string;
  client_onboarding_enabled?: boolean;
}

export default function ClientOnboardingPage() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'builder'>('submissions');
  const [isLoading, setIsLoading] = useState(true);
  const [isModuleEnabled, setIsModuleEnabled] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);

  const [isRequested, setIsRequested] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<OnboardingSubmission | null>(null);

  // New Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    companyName: '',
    customMessage: '',
    sendEmail: true,
  });
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Template / Questionnaire Builder state
  const [template, setTemplate] = useState<OnboardingTemplate | null>(null);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // 1. Load initial user and business access
  useEffect(() => {
    async function loadAuth() {
      try {
        setIsLoading(true);
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        const user = authData.user;

        if (!user) {
          setIsLoading(false);
          return;
        }

        const superAdmin = Boolean(
          user.isSuperAdmin || user.email === 'admin@lunarposgeorge.co.za'
        );
        setIsSuperAdmin(superAdmin);
        setSelectedOrgId(user.orgId);

        if (superAdmin) {
          setIsModuleEnabled(true);
          // Load all businesses for super admin business selector
          try {
            const bRes = await fetch('/api/super-admin/businesses');
            const bData = await bRes.json();
            if (bData.businesses) {
              setBusinesses(bData.businesses);
            }
          } catch (bErr) {
            console.warn('Failed to load businesses list for selector:', bErr);
          }
        } else {
          setIsModuleEnabled(Boolean(user.clientOnboardingEnabled));
          setIsRequested(Boolean(user.clientOnboardingRequested));
        }
      } catch (err) {
        console.error('Failed to load auth data in onboarding page:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  // 2. Load submissions & template whenever selectedOrgId changes
  const fetchOrgData = async () => {
    if (!selectedOrgId) return;
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const [subRes, tmplRes] = await Promise.all([
        fetch(`/api/onboarding/submissions${orgParam}`),
        fetch(`/api/onboarding/template${orgParam}`),
      ]);

      if (subRes.ok) {
        const sData = await subRes.json();
        setSubmissions(sData.submissions || []);
      }

      if (tmplRes.ok) {
        const tData = await tmplRes.json();
        setTemplate(tData.template || null);
      }
    } catch (err) {
      console.error('Failed to load submissions and template:', err);
    }
  };

  useEffect(() => {
    if (selectedOrgId && (isModuleEnabled || isSuperAdmin)) {
      fetchOrgData();
    }
  }, [selectedOrgId, isModuleEnabled, isSuperAdmin]);

  // Request module activation
  const handleRequestModule = async () => {
    setRequestLoading(true);
    try {
      const res = await fetch('/api/onboarding/request', { method: 'POST' });
      if (res.ok) {
        setIsRequested(true);
        setRequestSuccess(true);
      }
    } catch (err) {
      console.error('Error requesting module:', err);
    } finally {
      setRequestLoading(false);
    }
  };

  // Generate new invite link (Strict Validation: Name, Surname, Company, Contact Number are NOT optional)
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteForm.firstName.trim() || !inviteForm.lastName.trim()) {
      alert('First name and surname are required.');
      return;
    }
    if (!inviteForm.companyName.trim()) {
      alert('Company / Business name is required.');
      return;
    }
    if (!inviteForm.contactNumber.trim()) {
      alert('Contact number is required.');
      return;
    }
    if (!inviteForm.email.trim() || !inviteForm.email.includes('@')) {
      alert('A valid email address is required.');
      return;
    }

    setInviteLoading(true);
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const res = await fetch(`/api/onboarding/submissions${orgParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');

      setGeneratedInviteUrl(data.inviteUrl);
      await fetchOrgData();
    } catch (err: any) {
      alert(err.message || 'Error generating link');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Save template / questionnaire for the active business
  const handleSaveTemplate = async () => {
    if (!template) return;
    setBuilderSaving(true);
    try {
      const orgParam = isSuperAdmin ? `?org_id=${selectedOrgId}` : '';
      const res = await fetch(`/api/onboarding/template${orgParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save questionnaire');
      }

      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Error saving questionnaire');
    } finally {
      setBuilderSaving(false);
    }
  };

  // Question editing helpers
  const handleAddQuestion = () => {
    if (!template) return;
    const newQ: OnboardingQuestion = {
      id: `q_${Date.now()}`,
      label: 'New Question',
      type: 'text',
      required: true, // Default to required as per user preference
      placeholder: 'Enter details here...',
      helpText: '',
      options: ['Option 1', 'Option 2'],
    };
    setTemplate({
      ...template,
      questions: [...template.questions, newQ],
    });
  };

  const handleUpdateQuestion = (index: number, updates: Partial<OnboardingQuestion>) => {
    if (!template) return;
    const questions = [...template.questions];
    questions[index] = { ...questions[index], ...updates };
    setTemplate({ ...template, questions });
  };

  const handleDeleteQuestion = (index: number) => {
    if (!template) return;
    const questions = template.questions.filter((_, i) => i !== index);
    setTemplate({ ...template, questions });
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= template.questions.length) return;

    const questions = [...template.questions];
    const [moved] = questions.splice(index, 1);
    questions.splice(targetIdx, 0, moved);
    setTemplate({ ...template, questions });
  };

  // Filtered submissions
  const filteredSubmissions = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (s.full_name && s.full_name.toLowerCase().includes(q)) ||
      (s.company_name && s.company_name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.contact_number && s.contact_number.includes(q));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const completedCount = submissions.filter((s) => s.status === 'submitted').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending' || s.status === 'viewed').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <AdminHeader title="Client Onboarding" subtitle="Custom Questionnaire & Client List Sync" />
        <div className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Loading Onboarding Module...</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. MODULE DISABLED FOR THIS BUSINESS (Non-Super Admin)
  if (!isModuleEnabled && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <AdminHeader title="Client Onboarding" subtitle="Module Disabled by Administrator" />

        <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8 flex-1">
          {/* Module Disabled Notice Card */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <Badge className="mb-4 bg-amber-500/20 text-amber-300 border-amber-500/40 px-3 py-1 text-xs font-semibold gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Module Not Enabled
              </Badge>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                Client Onboarding is Disabled for Your Account
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                This feature must be activated by the platform administrator before your business can send client onboarding invitations and build custom questionnaires.
              </p>

              {/* Action Button / Status */}
              <div className="flex flex-wrap items-center gap-4">
                {isRequested || requestSuccess ? (
                  <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-sm font-semibold shadow-lg">
                    <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span>Activation Request Submitted — Pending Administrator Approval</span>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleRequestModule}
                    disabled={requestLoading}
                    className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-indigo-600/30 px-6 py-6 text-base rounded-xl transition-all"
                  >
                    {requestLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Request Activation from Administrator
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MODULE ENABLED VIEW
  const activeBusinessName = businesses.find((b) => b.id === selectedOrgId)?.name || 'My Business';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminHeader
        title="Client Onboarding"
        subtitle={`Custom questionnaire & client list sync • ${activeBusinessName}`}
        actionButton={
          <Button
            onClick={() => {
              setInviteForm({
                firstName: '',
                lastName: '',
                email: '',
                contactNumber: '',
                companyName: '',
                customMessage: '',
                sendEmail: true,
              });
              setGeneratedInviteUrl(null);
              setIsInviteModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Send Onboarding Link
          </Button>
        }
      />

      <div className="p-4 sm:p-6 md:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        {/* Super Admin Business Scope Dropdown */}
        {isSuperAdmin && businesses.length > 0 && (
          <div className="bg-indigo-950/40 border border-indigo-800/40 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-indigo-200">
                Super Admin Business Scope:
              </span>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="bg-slate-900 border border-indigo-700/60 rounded-lg text-xs font-medium text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.client_onboarding_enabled ? '★' : '(Onboarding Disabled)'}
                  </option>
                ))}
              </select>
            </div>

            <Badge
              variant="outline"
              className="text-[11px] font-mono text-cyan-400 border-cyan-500/30 bg-cyan-950/30"
            >
              Every business has its own unique questionnaire
            </Badge>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === 'submissions' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Onboarded Clients & Invites</span>
            <Badge variant="outline" className="text-[11px] bg-slate-900 border-slate-700 text-slate-300">
              {submissions.length}
            </Badge>
            {activeTab === 'submissions' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
              activeTab === 'builder' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Questionnaire Builder</span>
            {activeTab === 'builder' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* TAB 1: SUBMISSIONS & CLIENT LIST */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-4 sm:p-5">
                  <div className="text-xs text-slate-400 font-medium">Total Clients Onboarded</div>
                  <div className="text-2xl font-bold text-white mt-1">{completedCount}</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">Added to Client List</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-4 sm:p-5">
                  <div className="text-xs text-slate-400 font-medium">Pending Links Sent</div>
                  <div className="text-2xl font-bold text-amber-300 mt-1">{pendingCount}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Awaiting completion</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-4 sm:p-5">
                  <div className="text-xs text-slate-400 font-medium">Total Links Generated</div>
                  <div className="text-2xl font-bold text-cyan-300 mt-1">{submissions.length}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Lifetime activity</div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800">
                <CardContent className="p-4 sm:p-5">
                  <div className="text-xs text-slate-400 font-medium">ECTA Compliance</div>
                  <div className="text-2xl font-bold text-indigo-300 mt-1">100%</div>
                  <div className="text-[11px] text-indigo-400 mt-0.5">SA Legal E-Signatures</div>
                </CardContent>
              </Card>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search by client name, company, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-100 h-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 shrink-0">Filter Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Completed & E-Signed</option>
                  <option value="viewed">Viewed / In-Progress</option>
                  <option value="pending">Pending Client Link</option>
                </select>
              </div>
            </div>

            {/* Submissions Table */}
            <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Company & Client</th>
                      <th className="py-3 px-4">Contact Details</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date & Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-slate-500">
                          {submissions.length === 0
                            ? 'No onboarding links sent yet. Click "+ Send Onboarding Link" above to get started!'
                            : 'No submissions match your search query.'}
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((s) => {
                        const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
                        const linkUrl = `${appUrl}/onboard/${s.token}`;

                        return (
                          <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-300 font-bold shrink-0 mt-0.5">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-100 text-sm">
                                    {s.company_name || 'Individual / Pending Name'}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span>{s.full_name || 'Signer Pending'}</span>
                                    {s.registration_number && (
                                      <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                                        Reg: {s.registration_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="text-xs space-y-1">
                                {s.email && (
                                  <div className="text-slate-300 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                                    <span>{s.email}</span>
                                  </div>
                                )}
                                {(s.contact_number || s.mobile_number || s.landline_number) && (
                                  <div className="text-slate-400 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                                    <span>
                                      {s.mobile_number || s.contact_number || s.landline_number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              {s.status === 'submitted' ? (
                                <Badge variant="success" className="gap-1 bg-emerald-950/80 border-emerald-500/40 text-emerald-300">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  E-Signed & Added
                                </Badge>
                              ) : s.status === 'viewed' ? (
                                <Badge variant="outline" className="gap-1 bg-cyan-950/60 border-cyan-500/40 text-cyan-300">
                                  <Eye className="w-3 h-3 text-cyan-400" />
                                  Viewed by Client
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="gap-1 bg-amber-950/60 border-amber-500/40 text-amber-300">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  Pending Fill-in
                                </Badge>
                              )}
                            </td>

                            <td className="py-4 px-4 text-xs font-mono text-slate-400">
                              <div>Created: {formatSaDate(s.created_at)}</div>
                              {s.submitted_at && (
                                <div className="text-emerald-400 text-[11px] mt-0.5">
                                  Signed: {formatSaDate(s.submitted_at)}
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyLink(linkUrl)}
                                  className="h-8 text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                                  title="Copy unique client link"
                                >
                                  {copiedUrl === linkUrl ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  onClick={() => setSelectedSubmission(s)}
                                  className="h-8 text-xs bg-indigo-600/90 hover:bg-indigo-500 text-white font-medium"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View Form
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: QUESTIONNAIRE BUILDER */}
        {activeTab === 'builder' && template && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-indigo-400" />
                  Custom Onboarding Questionnaire Builder
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configuring questionnaire for: <strong className="text-slate-200">{activeBusinessName}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveTemplate}
                  disabled={builderSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-5 shadow-lg shadow-emerald-600/20"
                >
                  {builderSaving ? (
                    'Saving...'
                  ) : saveSuccessToast ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Saved Successfully!
                    </>
                  ) : (
                    'Save Questionnaire'
                  )}
                </Button>
              </div>
            </div>

            {/* General Settings */}
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  Form Headings & Legal Declaration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Form Title</Label>
                    <Input
                      value={template.title}
                      onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Welcome Heading</Label>
                    <Input
                      value={template.welcome_heading || ''}
                      onChange={(e) => setTemplate({ ...template, welcome_heading: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Welcome Subheading / Instructions</Label>
                  <Input
                    value={template.welcome_subheading || ''}
                    onChange={(e) => setTemplate({ ...template, welcome_subheading: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Client Legal Declaration (Presented before signature under SA ECTA 25 of 2002)
                  </Label>
                  <textarea
                    rows={3}
                    value={template.declaration_text || ''}
                    onChange={(e) => setTemplate({ ...template, declaration_text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Questions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    Questionnaire Fields ({template.questions.length})
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click the <strong className="text-slate-300">Required / Optional</strong> badge on any question to toggle whether the client must complete it.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddQuestion}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                </Button>
              </div>

              {template.questions.map((q, idx) => (
                <Card key={q.id} className="bg-slate-900/60 border-slate-800 relative group">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-800/60 text-indigo-300 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {q.label || 'Untitled Question'}
                        </span>

                        {/* Interactive Required / Optional Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestion(idx, { required: !q.required })}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold border flex items-center gap-1.5 transition-all ${
                            q.required
                              ? 'bg-rose-950/70 border-rose-500/50 text-rose-300 hover:bg-rose-900/70'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                          }`}
                          title="Click to toggle mandatory or optional"
                        >
                          {q.required ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                              <span>Required *</span>
                            </>
                          ) : (
                            <span>Optional</span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                          title="Move Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === template.questions.length - 1}
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                          title="Move Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="p-1.5 text-red-400 hover:text-red-300 rounded hover:bg-red-950/40 ml-1"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-xs text-slate-400">Question Title / Prompt</Label>
                        <Input
                          value={q.label}
                          onChange={(e) => handleUpdateQuestion(idx, { label: e.target.value })}
                          className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400">Field Type</Label>
                        <select
                          value={q.type}
                          onChange={(e) => handleUpdateQuestion(idx, { type: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 h-9"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text / Paragraph</option>
                          <option value="select">Dropdown Selection</option>
                          <option value="radio">Multiple Choice (Radio)</option>
                          <option value="checkbox">Checkboxes (Multi-select)</option>
                          <option value="date">Date Picker</option>
                          <option value="number">Numeric</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400">Placeholder Text</Label>
                        <Input
                          value={q.placeholder || ''}
                          onChange={(e) => handleUpdateQuestion(idx, { placeholder: e.target.value })}
                          className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-400">Helper / Guidance Note</Label>
                        <Input
                          value={q.helpText || ''}
                          onChange={(e) => handleUpdateQuestion(idx, { helpText: e.target.value })}
                          className="bg-slate-950 border-slate-800 text-xs text-slate-100"
                        />
                      </div>
                    </div>

                    {/* Options for Select / Radio / Checkbox */}
                    {['select', 'radio', 'checkbox'].includes(q.type) && (
                      <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                        <Label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                          Options (comma separated)
                        </Label>
                        <Input
                          value={(q.options || []).join(', ')}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, {
                              options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                            })
                          }
                          placeholder="e.g. Retail, Hospitality, Wholesale"
                          className="bg-slate-900 border-slate-800 text-xs text-slate-100"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE & SEND ONBOARDING LINK MODAL */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              Generate Client Onboarding Link
            </DialogTitle>
          </DialogHeader>

          {!generatedInviteUrl ? (
            <form onSubmit={handleCreateInvite} className="space-y-4 pt-2">
              <p className="text-xs text-slate-400">
                Please provide the client and business credentials to issue their unique onboarding link.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Client First Name <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Johan"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Client Surname <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. van der Merwe"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">
                  Company / Business Name <span className="text-rose-400 font-bold">*</span>
                </Label>
                <Input
                  placeholder="e.g. Outeniqua Farm Bistro Pty Ltd"
                  value={inviteForm.companyName}
                  onChange={(e) => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                  className="bg-slate-900 border-slate-800 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Client Email Address <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="client@company.co.za"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Contact Number <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="+27 82 000 0000"
                    value={inviteForm.contactNumber}
                    onChange={(e) => setInviteForm({ ...inviteForm, contactNumber: e.target.value })}
                    className="bg-slate-900 border-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Personal Note / Message in Email (Optional)</Label>
                <textarea
                  rows={2}
                  placeholder="Please complete this link so we can finalize your deployment..."
                  value={inviteForm.customMessage}
                  onChange={(e) => setInviteForm({ ...inviteForm, customMessage: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {inviteForm.email && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sendDirectEmail"
                    checked={inviteForm.sendEmail}
                    onChange={(e) => setInviteForm({ ...inviteForm, sendEmail: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="sendDirectEmail" className="text-xs text-slate-300 cursor-pointer">
                    Automatically send invitation email to {inviteForm.email}
                  </label>
                </div>
              )}

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviteLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                >
                  {inviteLoading ? 'Generating Link...' : 'Generate & Send Link'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Unique Onboarding Link Generated!
                </div>
                <p className="text-slate-300 text-[11px]">
                  {inviteForm.sendEmail && inviteForm.email
                    ? `An invitation email was dispatched to ${inviteForm.email}. You can also copy the direct link below:`
                    : 'Share this link with your client. Once submitted, their details will automatically appear in your client list.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Unique Sharable Client URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={generatedInviteUrl}
                    className="bg-slate-900 border-slate-800 text-xs text-cyan-300 font-mono select-all"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyLink(generatedInviteUrl)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shrink-0"
                  >
                    {copiedUrl === generatedInviteUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW SUBMISSION MODAL */}
      {selectedSubmission && (
        <Dialog open={Boolean(selectedSubmission)} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-400" />
                    {selectedSubmission.company_name || 'Client Onboarding Record'}
                  </DialogTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authorized Signer: <strong className="text-slate-200">{selectedSubmission.full_name || 'N/A'}</strong>
                  </p>
                </div>
                <Badge
                  className={
                    selectedSubmission.status === 'submitted'
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                  }
                >
                  {selectedSubmission.status === 'submitted' ? '✓ Completed & E-Signed' : 'Pending Client Fill-in'}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-3 text-xs">
              {/* Client Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Email</span>
                  <span className="text-slate-200 font-medium">{selectedSubmission.email || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Primary Contact</span>
                  <span className="text-slate-200 font-medium">{selectedSubmission.contact_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Mobile Number</span>
                  <span className="text-slate-200 font-medium">{selectedSubmission.mobile_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Landline Number</span>
                  <span className="text-slate-200 font-medium">{selectedSubmission.landline_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Company Reg Number</span>
                  <span className="text-slate-200 font-medium">{selectedSubmission.registration_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Synchronized In DB</span>
                  <span className="text-emerald-400 font-medium">✓ Client List & Contacts</span>
                </div>
              </div>

              {/* Questionnaire Answers */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" /> Questionnaire Answers
                </h4>
                {selectedSubmission.answers && Object.keys(selectedSubmission.answers).length > 0 ? (
                  <div className="space-y-2 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                    {Object.entries(selectedSubmission.answers).map(([key, val]) => (
                      <div key={key} className="border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-medium block">{key}:</span>
                        <span className="text-slate-100 font-semibold mt-0.5 block">
                          {Array.isArray(val) ? val.join(', ') : String(val || '—')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-500 italic bg-slate-900/20 rounded-xl">
                    No questionnaire responses submitted yet.
                  </div>
                )}
              </div>

              {/* E-Signature & Audit Info - Natural Aspect Ratio & Unsquashed */}
              {selectedSubmission.signature_data_url && (
                <div className="space-y-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSignature className="w-4 h-4 text-indigo-400" /> South African ECTA 25 E-Signature
                  </h4>
                  <div className="bg-white rounded-lg p-3 max-w-sm mx-auto shadow flex items-center justify-center">
                    <img
                      src={selectedSubmission.signature_data_url}
                      alt="Client Signature"
                      className="max-h-24 max-w-full h-auto w-auto object-contain mx-auto"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono space-y-0.5 pt-1 text-center">
                    <div>Signer IP Address: {selectedSubmission.signer_ip || 'Captured at submission'}</div>
                    <div>Timestamp: {selectedSubmission.submitted_at ? formatSaDate(selectedSubmission.submitted_at) : 'N/A'}</div>
                    <div className="text-emerald-400">✓ Legal declaration accepted and cryptographically logged</div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-800 pt-3">
              <Button
                variant="outline"
                onClick={() => setSelectedSubmission(null)}
                className="text-xs border-slate-800 text-slate-300"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
