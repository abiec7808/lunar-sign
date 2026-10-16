'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  User,
  Phone,
  Mail,
  FileSignature,
  FileText,
  RotateCcw,
  Printer,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatSaDate } from '@/lib/dates';
import { OnboardingQuestion, OnboardingSubmission, OnboardingTemplate } from '@/lib/onboarding/service';

export default function PublicClientOnboardingPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loaded data
  const [submission, setSubmission] = useState<OnboardingSubmission | null>(null);
  const [template, setTemplate] = useState<OnboardingTemplate | null>(null);
  const [org, setOrg] = useState<{
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    reply_to_email: string | null;
    phone: string | null;
  } | null>(null);

  // Form step
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form inputs
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    mobileNumber: '',
    landlineNumber: '',
    companyName: '',
    registrationNumber: '',
    declarationAgreed: false,
  });

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});

  // Signature state
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Load public onboarding data
  useEffect(() => {
    async function loadOnboarding() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/onboarding/public/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'This onboarding link is invalid or expired.');
        }

        const data = await res.json();
        setSubmission(data.submission);
        setTemplate(data.template);
        setOrg(data.organisation);

        // Pre-fill form if existing or already submitted
        const sub = data.submission;
        setFormData({
          firstName: sub.first_name || '',
          lastName: sub.last_name || '',
          email: sub.email || '',
          contactNumber: sub.contact_number || '',
          mobileNumber: sub.mobile_number || '',
          landlineNumber: sub.landline_number || '',
          companyName: sub.company_name || '',
          registrationNumber: sub.registration_number || '',
          declarationAgreed: Boolean(sub.signer_declaration_agreed),
        });

        if (sub.answers && typeof sub.answers === 'object') {
          setAnswers(sub.answers);
        }

        if (sub.status === 'submitted') {
          setIsSubmittedSuccess(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load onboarding link');
      } finally {
        setLoading(false);
      }
    }

    loadOnboarding();
  }, [token]);

  // Synchronize drawing canvas resolution with container to prevent squashed signatures
  useEffect(() => {
    if (step === 3 && signatureMode === 'draw' && sigCanvasRef.current) {
      const timer = setTimeout(() => {
        const canvas = sigCanvasRef.current?.getCanvas();
        if (canvas && canvas.parentElement) {
          const rect = canvas.parentElement.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 50) {
            canvas.width = rect.width;
            canvas.height = rect.height;
          }
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [step, signatureMode]);

  // When step 3 is opened, auto-populate typedSignature if blank
  useEffect(() => {
    if (step === 3 && !typedSignature.trim()) {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (fullName) {
        setTypedSignature(fullName);
      }
    }
  }, [step, formData.firstName, formData.lastName, typedSignature]);

  // Answer handler for custom questions
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    // Clear inline error if answered
    if (step2Errors[questionId]) {
      setStep2Errors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Checkbox multi-select answer handler
  const handleCheckboxToggle = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      let updated: string[];
      if (current.includes(option)) {
        updated = current.filter((o: string) => o !== option);
      } else {
        updated = [...current, option];
      }
      return { ...prev, [questionId]: updated };
    });

    if (step2Errors[questionId]) {
      setStep2Errors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Step 1 Validation: Name, Surname, Contact Number, Email, Company Name are NOT optional
  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert('First name and surname are required.');
      return false;
    }
    if (!formData.companyName.trim()) {
      alert('Business / Company name is required.');
      return false;
    }
    if (!formData.contactNumber.trim()) {
      alert('Primary contact number is required.');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      alert('A valid email address is required.');
      return false;
    }
    return true;
  };

  // Step 2 Validation: Check all questions marked as required
  const validateStep2 = () => {
    if (!template) return true;
    const errors: Record<string, string> = {};

    for (const q of template.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          errors[q.id] = `This question is required by ${org?.name || 'the business'}.`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setStep2Errors(errors);
      alert('Please provide answers for all required questions before proceeding.');
      return false;
    }

    setStep2Errors({});
    return true;
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.declarationAgreed) {
      alert('Please review and agree to the legal declaration to continue.');
      return;
    }

    let signatureDataUrl: string | undefined = undefined;

    if (template?.require_signature) {
      if (signatureMode === 'draw') {
        if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
          alert('Please provide your electronic signature in the box below.');
          return;
        }
        try {
          signatureDataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
        } catch {
          signatureDataUrl = sigCanvasRef.current.toDataURL('image/png');
        }
      } else {
        // Type Signature Mode
        const fullNameFallback = `${formData.firstName} ${formData.lastName}`.trim();
        const effectiveName = (typedSignature.trim() || fullNameFallback).trim();

        if (!effectiveName) {
          alert('Please enter your full legal name to generate your electronic signature.');
          return;
        }

        // Generate crisp 800x220 transparent cursive signature PNG
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 220;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 800, 220);
          ctx.fillStyle = '#0f172a';
          ctx.font = 'italic 54px Georgia, "Dancing Script", "Caveat", cursive, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(effectiveName, 400, 100);

          // Subtle elegant underline
          ctx.beginPath();
          const textWidth = Math.min(ctx.measureText(effectiveName).width, 700);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2.5;
          ctx.moveTo(400 - textWidth / 2 - 15, 140);
          ctx.lineTo(400 + textWidth / 2 + 15, 140);
          ctx.stroke();

          signatureDataUrl = canvas.toDataURL('image/png');
        }
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/onboarding/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          answers,
          signatureDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit onboarding form.');
      }

      setIsSubmittedSuccess(true);
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      // Refresh public record
      const refresh = await fetch(`/api/onboarding/public/${token}`);
      if (refresh.ok) {
        const rData = await refresh.json();
        setSubmission(rData.submission);
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting onboarding form');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading secure onboarding portal...</p>
        </div>
      </div>
    );
  }

  if (error || !submission || !template) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-center p-6 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-950 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Onboarding Link Notice</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This onboarding link could not be found or has expired.'}
          </p>
        </Card>
      </div>
    );
  }

  // ALREADY SUBMITTED VIEW (Returned already populated to the client!)
  if (isSubmittedSuccess || submission.status === 'submitted') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* Header Branding */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {org?.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="w-10 h-10 object-contain rounded-xl bg-slate-900 border border-slate-800 p-1"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow"
                  style={{ backgroundColor: org?.primary_color || '#4f46e5' }}
                >
                  🌕
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-white leading-tight">{org?.name}</h1>
                <span className="text-[11px] text-cyan-400 font-mono">
                  Official Client Onboarding Portal
                </span>
              </div>
            </div>

            <Badge className="bg-emerald-950 border-emerald-500/40 text-emerald-300 text-xs gap-1.5 py-1 px-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified & E-Signed
            </Badge>
          </div>

          {/* Banner */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-6 sm:p-8 space-y-2 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Onboarding Completed Successfully!
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              {submission.company_name} — Account Configured
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Thank you, <strong>{submission.full_name}</strong>. Your onboarding record and statutory e-signature have been securely logged under South African Electronic Communications and Transactions Act 25 of 2002.
            </p>
          </div>

          {/* Populated Details Summary Card */}
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Submitted Business & Contact Information
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / Save Record
              </Button>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Registered Company Name</span>
                  <div className="text-slate-100 font-bold text-sm">{submission.company_name}</div>
                  {submission.registration_number && (
                    <div className="text-slate-400 font-mono text-[11px]">
                      Reg No: {submission.registration_number}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Authorized Representative</span>
                  <div className="text-slate-100 font-bold text-sm">{submission.full_name}</div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-500" /> {submission.email}
                  </div>
                </div>

                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Primary Contact Number</span>
                  <div className="text-slate-200 font-medium">{submission.contact_number}</div>
                  {submission.mobile_number && (
                    <div className="text-slate-400 text-[11px]">Mobile: {submission.mobile_number}</div>
                  )}
                </div>

                <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Additional Phone</span>
                  <div className="text-slate-300 font-medium">
                    {submission.landline_number ? `Landline: ${submission.landline_number}` : 'None provided'}
                  </div>
                </div>
              </div>

              {/* Populated Questionnaire Answers */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" /> Setup Questionnaire Responses
                </h4>
                <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  {template.questions.map((q) => {
                    const ans = submission.answers ? submission.answers[q.id] : null;
                    return (
                      <div key={q.id} className="border-b border-slate-800/50 pb-2.5 last:border-0 last:pb-0">
                        <span className="text-slate-400 text-xs font-medium block">{q.label}</span>
                        <span className="text-slate-100 font-semibold text-xs mt-0.5 block">
                          {Array.isArray(ans)
                            ? ans.join(', ')
                            : ans !== undefined && ans !== null && ans !== ''
                            ? String(ans)
                            : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Populated E-Signature Card (Unsquashed with natural aspect ratio) */}
              {submission.signature_data_url && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSignature className="w-4 h-4 text-indigo-400" /> Electronic Signature & Audit Trail
                  </h4>
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="bg-white p-3 rounded-lg max-w-sm shadow mx-auto sm:mx-0 flex items-center justify-center">
                      <img
                        src={submission.signature_data_url}
                        alt="Signature"
                        className="max-h-24 max-w-full h-auto w-auto object-contain mx-auto"
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono space-y-1 text-center sm:text-right">
                      <div>Signer: {submission.full_name}</div>
                      <div>Date: {submission.submitted_at ? formatSaDate(submission.submitted_at) : 'N/A'}</div>
                      <div>IP: {submission.signer_ip || 'Captured at submission'}</div>
                      <div className="text-emerald-400 font-sans font-semibold">
                        ✓ SA ECTA 25 of 2002 Compliant
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ACTIVE FILL-IN ONBOARDING FORM
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="w-10 h-10 object-contain rounded-xl bg-slate-900 border border-slate-800 p-1"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow"
                style={{ backgroundColor: org?.primary_color || '#4f46e5' }}
              >
                🌕
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-white leading-tight">{org?.name}</h1>
              <span className="text-[11px] text-cyan-400 font-mono">Client Onboarding Portal</span>
            </div>
          </div>

          <Badge variant="outline" className="text-slate-400 border-slate-800 text-[11px] gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            ECTA 25 Compliant
          </Badge>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-2 px-2">
          <div
            className={`flex-1 text-center pb-2 border-b-2 text-xs font-semibold ${
              step >= 1 ? 'border-indigo-500 text-indigo-400' : 'border-slate-800 text-slate-500'
            }`}
          >
            1. Company & Contact
          </div>
          <div
            className={`flex-1 text-center pb-2 border-b-2 text-xs font-semibold ${
              step >= 2 ? 'border-indigo-500 text-indigo-400' : 'border-slate-800 text-slate-500'
            }`}
          >
            2. Questionnaire
          </div>
          <div
            className={`flex-1 text-center pb-2 border-b-2 text-xs font-semibold ${
              step >= 3 ? 'border-indigo-500 text-indigo-400' : 'border-slate-800 text-slate-500'
            }`}
          >
            3. Signature & Submit
          </div>
        </div>

        {/* Welcome Card */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 p-6 space-y-1.5 shadow-xl">
          <h2 className="text-lg font-bold text-white">
            {template.welcome_heading || 'Client Onboarding Form'}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            {template.welcome_subheading || 'Please fill in your company and contact information below.'}
          </p>
        </div>

        {/* STEP 1: CONTACT & COMPANY DETAILS */}
        {step === 1 && (
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <User className="w-4 h-4 text-indigo-400" />
                Contact Person & Company Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    First Name <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Johan"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Surname <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. van der Merwe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Registered Company Name <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Outeniqua Farm Bistro Pty Ltd"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">
                    Company Registration Number (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. 2024/123456/07"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Email Address <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="client@company.co.za"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Primary Contact Number <span className="text-rose-400 font-bold">*</span>
                  </Label>
                  <Input
                    placeholder="+27 44 874 0000"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Mobile Number (Optional)</Label>
                  <Input
                    placeholder="+27 82 000 0000"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">Landline Number (Optional)</Label>
                  <Input
                    placeholder="+27 44 874 1234"
                    value={formData.landlineNumber}
                    onChange={(e) => setFormData({ ...formData, landlineNumber: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6"
                >
                  Continue to Questionnaire <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: CUSTOM BUSINESS QUESTIONNAIRE (Strict Required vs Optional Support) */}
        {step === 2 && (
          <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-4 h-4 text-cyan-400" />
                Onboarding Questionnaire
              </h3>

              {template.questions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No additional questions required. Click below to proceed to signature.
                </div>
              ) : (
                template.questions.map((q) => {
                  const hasError = Boolean(step2Errors[q.id]);

                  return (
                    <div
                      key={q.id}
                      className={`space-y-1.5 p-3 rounded-xl transition-all ${
                        hasError
                          ? 'bg-rose-950/20 border border-rose-500/50'
                          : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                          <span>{q.label}</span>
                          {q.required && <span className="text-rose-400 font-bold">*</span>}
                        </Label>
                        {q.required ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300 bg-rose-950/70 border border-rose-500/40 px-2 py-0.5 rounded">
                            Required *
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            (Optional)
                          </span>
                        )}
                      </div>

                      {q.helpText && (
                        <span className="text-[11px] text-slate-400 block mb-1">{q.helpText}</span>
                      )}

                      {/* Short Text */}
                      {q.type === 'text' && (
                        <Input
                          placeholder={q.placeholder || ''}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className={`bg-slate-950 border-slate-800 text-xs ${
                            hasError ? 'border-rose-500' : ''
                          }`}
                        />
                      )}

                      {/* Numeric */}
                      {q.type === 'number' && (
                        <Input
                          type="number"
                          placeholder={q.placeholder || ''}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className={`bg-slate-950 border-slate-800 text-xs ${
                            hasError ? 'border-rose-500' : ''
                          }`}
                        />
                      )}

                      {/* Date */}
                      {q.type === 'date' && (
                        <Input
                          type="date"
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className={`bg-slate-950 border-slate-800 text-xs text-slate-200 ${
                            hasError ? 'border-rose-500' : ''
                          }`}
                        />
                      )}

                      {/* Long Text / Textarea */}
                      {q.type === 'textarea' && (
                        <textarea
                          rows={3}
                          placeholder={q.placeholder || ''}
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className={`w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 font-sans ${
                            hasError ? 'border-rose-500' : ''
                          }`}
                        />
                      )}

                      {/* Dropdown Select */}
                      {q.type === 'select' && (
                        <select
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className={`w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 ${
                            hasError ? 'border-rose-500' : ''
                          }`}
                        >
                          <option value="">{q.placeholder || 'Select an option...'}</option>
                          {(q.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Radio Options */}
                      {q.type === 'radio' && (
                        <div className="space-y-1.5 pt-1">
                          {(q.options || []).map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={answers[q.id] === opt}
                                onChange={() => handleAnswerChange(q.id, opt)}
                                className="text-indigo-600 bg-slate-950 border-slate-700"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Checkbox Options */}
                      {q.type === 'checkbox' && (
                        <div className="space-y-1.5 pt-1">
                          {(q.options || []).map((opt) => {
                            const isChecked = Array.isArray(answers[q.id]) && answers[q.id].includes(opt);
                            return (
                              <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCheckboxToggle(q.id, opt)}
                                  className="rounded text-indigo-600 bg-slate-950 border-slate-700"
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Inline Error Message */}
                      {hasError && (
                        <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" /> {step2Errors[q.id]}
                        </span>
                      )}
                    </div>
                  );
                })
              )}

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-400"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setStep(3);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6"
                >
                  Continue to Signature <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: DECLARATION & E-SIGNATURE (Draw or Type - Never Squashed!) */}
        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
              <CardContent className="p-6 space-y-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <FileSignature className="w-4 h-4 text-indigo-400" />
                  Statutory Declaration & Digital Signature
                </h3>

                {/* Declaration Box */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
                  <div className="font-semibold text-slate-200">Legal Declaration (SA ECTA 25 of 2002):</div>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    {template.declaration_text ||
                      'I confirm that all information supplied is complete and true, and I am authorized to bind the business.'}
                  </p>

                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer border-t border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={formData.declarationAgreed}
                      onChange={(e) =>
                        setFormData({ ...formData, declarationAgreed: e.target.checked })
                      }
                      className="mt-0.5 rounded text-indigo-600 bg-slate-900 border-slate-700"
                      required
                    />
                    <span className="text-xs text-slate-200 font-medium">
                      I accept the declaration and confirm that my electronic signature represents my legally binding agreement.
                    </span>
                  </label>
                </div>

                {/* Signature Canvas */}
                {template.require_signature && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-200">
                        Electronic Signature <span className="text-rose-400">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSignatureMode('draw')}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            signatureMode === 'draw'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                          }`}
                        >
                          Draw Signature
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignatureMode('type')}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            signatureMode === 'type'
                              ? 'bg-indigo-600 text-white shadow'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                          }`}
                        >
                          Type Signature
                        </button>
                      </div>
                    </div>

                    {signatureMode === 'draw' ? (
                      <div className="space-y-2">
                        <div
                          ref={canvasContainerRef}
                          className="rounded-xl border border-slate-700 bg-white overflow-hidden shadow-inner h-48 flex items-center justify-center touch-none"
                        >
                          <SignatureCanvas
                            ref={sigCanvasRef}
                            canvasProps={{
                              className: 'w-full h-full cursor-crosshair touch-none object-contain',
                              style: { width: '100%', height: '100%', touchAction: 'none' },
                            }}
                            penColor="#0f172a"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Sign inside the box using your finger, stylus, trackpad, or mouse.</span>
                          <button
                            type="button"
                            onClick={() => sigCanvasRef.current?.clear()}
                            className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Clear Signature
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-300">Type Your Full Legal Name</Label>
                          <Input
                            placeholder="Type full legal name..."
                            value={typedSignature}
                            onChange={(e) => setTypedSignature(e.target.value)}
                            className="bg-slate-950 border-slate-800 text-sm font-medium text-white h-11"
                          />
                        </div>

                        {/* Live Cursive Signature Preview (Never squashed!) */}
                        <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-300 text-center flex flex-col items-center justify-center min-h-24">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                            Live Electronic Signature Preview
                          </span>
                          <span className="font-serif italic text-3xl text-slate-900 border-b-2 border-slate-900 pb-1 px-4">
                            {typedSignature.trim() || `${formData.firstName} ${formData.lastName}`.trim() || 'Your Signature Preview'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          Typing your name generates a legally recognized electronic signature under SA ECTA 25 of 2002.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="text-xs text-slate-400"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-8 shadow-lg shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Onboarding
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
