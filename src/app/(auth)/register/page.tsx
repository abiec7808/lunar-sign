'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldCheck, Building2, User, Mail, Lock, Phone, FileText, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+27 ');
  const [vatNumber, setVatNumber] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!businessName.trim()) {
      setError('Please provide your business or company name.');
      return;
    }
    if (!adminFullName.trim()) {
      setError('Please provide the administrator full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid work email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          adminFullName: adminFullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          vatNumber: vatNumber.trim() || undefined,
          companyRegNumber: companyRegNumber.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business account.');
      }

      // Success: redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-2xl font-bold text-white mb-3 shadow-xl shadow-indigo-500/25">
            🌕
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create Business Account</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Self-hosted South African ECTA 25 of 2002 & POPIA compliant electronic signature platform for your enterprise.
          </p>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-md">
          <form onSubmit={handleRegisterSubmit}>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Business Information Section */}
              <div className="border-b border-slate-800 pb-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Building2 className="w-4 h-4" /> Company & Organization Details
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Registered Business / Trade Name *</Label>
                  <Input
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Logistics (Pty) Ltd"
                    className="mt-1 bg-slate-950 border-slate-700 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">SARS VAT Number (Optional)</Label>
                    <Input
                      maxLength={10}
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="4XXXXXXXXX"
                      className="mt-1 bg-slate-950 border-slate-700 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs">CIPC Registration No (Optional)</Label>
                    <Input
                      value={companyRegNumber}
                      onChange={(e) => setCompanyRegNumber(e.target.value)}
                      placeholder="2020/123456/07"
                      className="mt-1 bg-slate-950 border-slate-700 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Administrator Account Section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <User className="w-4 h-4" /> Administrator Credentials
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">Admin Full Legal Name *</Label>
                    <Input
                      required
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="e.g. Johan Van Der Merwe"
                      className="mt-1 bg-slate-950 border-slate-700 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 text-xs">Direct Business Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+27 82 123 4567"
                      className="mt-1 bg-slate-950 border-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Work Email Address (Username) *</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourcompany.co.za"
                    className="mt-1 bg-slate-950 border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Master Password *</Label>
                  <Input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password (min 6 chars)"
                    className="mt-1 bg-slate-950 border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/50 flex items-start gap-2.5 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  By signing up, your company instance is provisioned with isolated data partitions, cryptographic audit trail hashing, and automated South African legal compliance.
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-2.5 text-xs shadow-lg shadow-indigo-600/25 transition-all"
              >
                {isLoading ? (
                  'Saving & Provisioning Business Instance...'
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Create Business Account <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <div className="text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2">
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
