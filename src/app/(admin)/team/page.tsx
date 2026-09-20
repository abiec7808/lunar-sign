'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserCheck, UserPlus, Shield, ShieldAlert, Mail, Users, Check, AlertCircle } from 'lucide-react';
import { formatSaDate } from '@/lib/dates';

interface Member {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  is_active: boolean;
  totp_enabled?: boolean;
  created_at: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [maxUsers, setMaxUsers] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [invitePhone, setInvitePhone] = useState('+27 ');
  const [inviteError, setInviteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (data.members) {
        setMembers(data.members);
        if (data.maxUsers) setMaxUsers(data.maxUsers);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: inviteFullName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          phone: invitePhone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite team member');
      }

      setIsInviteOpen(false);
      setInviteFullName('');
      setInviteEmail('');
      await fetchTeam();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLimitReached = members.length >= maxUsers;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Team Members & User Limits"
        subtitle="Manage organisation team accounts, role assignments, and member limits."
        actionButton={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex border-slate-700 bg-slate-900 text-slate-300 gap-1.5 py-1 px-2.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {members.length} / {maxUsers} Users (Tier Limit)
              </span>
            </Badge>

            <Button
              onClick={() => setIsInviteOpen(true)}
              disabled={isLimitReached}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              {isLimitReached ? 'User Limit Reached' : 'Invite Team Member'}
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {isLimitReached && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Your business has reached the <strong>{maxUsers}-user maximum</strong> for this tier. To add more users, request an account upgrade from the platform administrator.
              </span>
            </div>
            <a href="mailto:admin@lunarposgeorge.co.za?subject=Request%20User%20Limit%20Increase">
              <Button size="sm" variant="outline" className="text-xs border-amber-600/40 text-amber-200">
                Contact Admin
              </Button>
            </a>
          </div>
        )}

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-6">Member Name</th>
                    <th className="py-3 px-6">Email Address</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">2FA Security</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow">
                          {m.full_name ? m.full_name[0] : 'U'}
                        </div>
                        {m.full_name}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300 font-mono">{m.email}</td>
                      <td className="py-4 px-6">
                        <Badge variant={m.role === 'owner' ? 'default' : 'secondary'} className="capitalize text-[11px]">
                          {m.role}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        {m.totp_enabled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                            <Shield className="w-3.5 h-3.5" /> Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> Standard
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={m.is_active ? 'success' : 'destructive'} className="text-[10px]">
                          {m.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-400">
                        {formatSaDate(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 my-2">
            {inviteError && (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{inviteError}</span>
              </div>
            )}

            <div>
              <Label className="text-slate-300 text-xs">Full Legal Name *</Label>
              <Input
                required
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="mt-1 bg-slate-950 border-slate-700 text-xs"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-xs">Work Email Address *</Label>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="sarah@yourcompany.co.za"
                className="mt-1 bg-slate-950 border-slate-700 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-xs">Permission Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-950 text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="admin">Admin (Manage Docs & Settings)</option>
                  <option value="member">Member (Create & Send Docs)</option>
                  <option value="viewer">Viewer (Read-Only Copy)</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-300 text-xs">Phone (Optional)</Label>
                <Input
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  placeholder="+27 82 123 4567"
                  className="mt-1 bg-slate-950 border-slate-700 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
                {isSubmitting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
