'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  LayoutDashboard,
  Copy,
  Users,
  UserCheck,
  Settings,
  Shield,
  ExternalLink,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/templates', label: 'Templates', icon: Copy },
  { href: '/contacts', label: 'Address Book', icon: Users },
  { href: '/team', label: 'Team & Roles', icon: UserCheck },
  { href: '/settings', label: 'Settings & Branding', icon: Settings },
  { href: '/settings/popia', label: 'POPIA & Compliance', icon: Shield },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [orgName, setOrgName] = useState<string>('Lunar Sign');
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
          if (data.user.orgName) setOrgName(data.user.orgName);
          if (data.user.email === 'admin@lunarposgeorge.co.za' || data.user.isSuperAdmin) {
            setIsSuperAdmin(true);
          }
        }
      } catch (err) {
        console.error('Failed to load org name in sidebar:', err);
      }
    }
    loadOrg();
  }, []);

  const navItems = isSuperAdmin
    ? [
        ...NAV_ITEMS,
        { href: '/businesses', label: 'Businesses (Super Admin)', icon: Building },
      ]
    : NAV_ITEMS;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 shrink-0">
            🌕
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-white tracking-tight leading-tight truncate" title={orgName}>
              {orgName}
            </h1>
            <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase block truncate">
              South Africa • ECTA 25
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Legal Info */}
      <div className="p-4 border-t border-slate-800/80 space-y-2.5">
        <Link
          href="/verify"
          className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" /> Verify Any Document
          </span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </Link>

        <div className="text-[9px] text-slate-500 text-center leading-tight">
          POPIA 4 of 2013 & ECTA 25 of 2002 Compliant
          <br />
          Encrypted Data Isolation
        </div>
      </div>
    </aside>
  );
}
