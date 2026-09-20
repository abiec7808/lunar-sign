'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, LogOut, Building2, User } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actionButton }: AdminHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<{
    fullName: string;
    email: string;
    role: string;
    orgName: string;
  } | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error('Failed to load active user:', err);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  const displayName = user?.fullName || 'Lunar Administrator';
  const displayEmail = user?.email || 'admin@lunarposgeorge.co.za';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD';

  return (
    <header className="min-h-16 py-2 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md px-4 sm:px-6 md:px-8 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sticky top-0 z-30">
      <div className="overflow-hidden">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{title}</h2>
        {subtitle && <p className="text-[11px] sm:text-xs text-slate-400 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {actionButton}

        <div className="h-5 w-px bg-slate-800" />

        {/* Business Badge */}
        {user?.orgName && (
          <Badge variant="outline" className="hidden lg:flex items-center gap-1.5 py-1 px-2.5 border-slate-700 bg-slate-900/60 text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold truncate max-w-[140px]">{user.orgName}</span>
          </Badge>
        )}

        {/* 2FA Security Badge */}
        <Badge variant="success" className="hidden sm:flex items-center gap-1.5 py-1 px-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-300">Live DB</span>
        </Badge>

        {/* Admin Profile */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow">
            {initials}
          </div>
          <div className="hidden md:block text-left text-xs leading-tight">
            <div className="font-semibold text-slate-200">{displayName}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{displayEmail}</div>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          title="Sign out of account"
          className="text-slate-400 hover:text-red-400 p-2 h-8 w-8"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
