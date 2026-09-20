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
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems = isSuperAdmin
    ? [
        ...NAV_ITEMS,
        { href: '/businesses', label: 'Businesses (Super Admin)', icon: Building },
      ]
    : NAV_ITEMS;

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full bg-slate-950">
      <div>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
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
          {/* Close button on mobile drawer */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
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
          Encrypted Multi-Tenant Isolation
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex w-64 bg-slate-950 border-r border-slate-800 flex-col shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* 2. Mobile Top Navigation Header with Hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow">
            🌕
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[180px]">{orgName}</span>
        </div>
      </div>

      {/* 3. Mobile Slide-in Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
            onClick={() => setIsMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[80vw] h-full bg-slate-950 border-r border-slate-800 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
