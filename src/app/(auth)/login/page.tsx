'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Shield, Lock, AlertCircle, ArrowRight, Building2, Sparkles } from 'lucide-react';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/security/rate-limit';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@lunarposgeorge.co.za');
  const [password, setPassword] = useState('Sharne2010!123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check rate limiter
    const rateLimit = checkRateLimit(email);
    if (!rateLimit.allowed) {
      setError(`Account temporarily locked out due to too many failed attempts. Try again in ${rateLimit.lockoutRemainingSeconds} seconds.`);
      return;
    }

    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        recordFailedAttempt(email);
        throw new Error(data.error || 'Invalid credentials.');
      }

      resetRateLimit(email);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-xl font-bold text-white mx-auto mb-2 shadow-lg shadow-indigo-500/25">
              🌕
            </div>
            <CardTitle className="text-xl font-extrabold text-white tracking-tight">
              Lunar Sign Admin Portal
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Sign in to manage and dispatch electronic signature envelopes
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLoginSubmit}>
            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <Label className="text-slate-300 text-xs">Work Email Address</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lunarposgeorge.co.za"
                  className="mt-1 bg-slate-950 border-slate-700 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 text-xs">Password</Label>
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1 bg-slate-950 border-slate-700 text-xs"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="text-indigo-300 font-semibold flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" /> Live Database Authentication
                </div>
                <div>Connected to live Supabase Postgres & SMTP server.</div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 text-xs shadow-lg shadow-indigo-600/25"
              >
                {isLoading ? (
                  'Signing in to Supabase Database...'
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Sign In to Dashboard <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <div className="text-center text-xs text-slate-400 border-t border-slate-800/80 pt-3 w-full">
                New business?{' '}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2">
                  Create a Business Account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
