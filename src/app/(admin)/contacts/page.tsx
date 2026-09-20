'use client';

import React, { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Plus, Search, Mail, Phone, Trash2 } from 'lucide-react';

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const [contacts, setContacts] = useState([
    { id: '1', name: 'Johan Van Der Merwe', email: 'johan@example.co.za', phone: '+27 82 123 4567', role: 'Signer' },
    { id: '2', name: 'Thabo Mokoena', email: 'thabo@example.co.za', phone: '+27 83 987 6543', role: 'Signer' },
    { id: '3', name: 'Sarah Jenkins', email: 'sarah@example.co.za', phone: '+27 71 555 1234', role: 'Approver' },
    { id: '4', name: 'Pieter Botha', email: 'pieter@example.co.za', phone: '+27 84 111 2233', role: 'Signer' },
  ]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Address Book & Contacts"
        subtitle="Manage recurring signatories and recipient details with automatic autocomplete in envelopes."
        actionButton={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
            <Plus className="w-4 h-4 mr-1.5" /> Add Contact
          </Button>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <Input
            placeholder="Search contacts by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-xs"
          />
        </div>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-6">Email Address</th>
                    <th className="py-3 px-6">Phone (Mobile)</th>
                    <th className="py-3 px-6">Default Role</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-100 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-bold">
                          {c.name[0]}
                        </div>
                        {c.name}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-300 font-mono">{c.email}</td>
                      <td className="py-4 px-6 text-xs text-slate-400 font-mono">{c.phone}</td>
                      <td className="py-4 px-6 text-xs text-indigo-300 font-semibold">{c.role}</td>
                      <td className="py-4 px-6 text-right">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
