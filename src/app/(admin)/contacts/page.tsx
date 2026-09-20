'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Plus, Search, Mail, Phone, Trash2, UserPlus, AlertCircle, Edit, Check } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'signer',
  });

  // Fetch contacts from live database
  const loadContacts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add contact');
      }

      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', role: 'signer' });
      await loadContacts();
    } catch (err: any) {
      setFormError(err.message || 'Error creating contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact) return;
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingContact.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update contact');
      }

      setIsEditModalOpen(false);
      setEditingContact(null);
      setFormData({ name: '', email: '', phone: '', role: 'signer' });
      setSuccessToast(`Contact "${formData.name}" updated successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
      await loadContacts();
    } catch (err: any) {
      setFormError(err.message || 'Error updating contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to remove this contact from your address book?')) return;
    try {
      const res = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Address Book & Contacts"
        subtitle="Manage recurring signatories and recipient details with automatic autocomplete in envelopes."
        actionButton={
          <Button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Contact
          </Button>
        }
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <Input
              placeholder="Search contacts by name, email, or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-xs text-white placeholder:text-slate-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total Contacts: <strong className="text-white">{contacts.length}</strong>
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading address book...</div>
        ) : contacts.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800 text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">Your Address Book is Empty</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Save your regular clients, suppliers, and signatories here so you can quickly populate them in 1-click when drafting document envelopes.
            </p>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
            >
              <UserPlus className="w-4 h-4 mr-1.5" /> Add First Contact
            </Button>
          </Card>
        ) : (
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
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
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                          No contacts matched "{searchTerm}"
                        </td>
                      </tr>
                    ) : (
                      filtered.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-100 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                              {c.name[0]?.toUpperCase() || 'U'}
                            </div>
                            <span>{c.name}</span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-300 font-mono">{c.email}</td>
                          <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                            {c.phone || <span className="text-slate-600 italic">None</span>}
                          </td>
                          <td className="py-4 px-6 text-xs">
                            <span className="capitalize px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold text-[11px]">
                              {c.role}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingContact(c);
                                setFormData({
                                  name: c.name,
                                  email: c.email,
                                  phone: c.phone || '',
                                  role: c.role || 'signer',
                                });
                                setFormError('');
                                setIsEditModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 h-8 w-8 p-0"
                              title="Edit Contact"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContact(c.id)}
                              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Contact Modal Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" /> Add New Signatory / Contact
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddContact} className="space-y-4 mt-2">
            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Full Legal Name *</Label>
              <Input
                required
                placeholder="e.g. Johan Van Der Merwe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Email Address *</Label>
              <Input
                required
                type="email"
                placeholder="e.g. johan@example.co.za"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Mobile Phone (Optional for SMS OTP)</Label>
              <Input
                type="tel"
                placeholder="e.g. +27 82 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Default Signing Role</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-700 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="signer">Signer (Signs & Fills)</option>
                <option value="approver">Approver (Reviews & Approves)</option>
                <option value="filler">Filler (Fills Fields Only)</option>
                <option value="viewer">Viewer (Receives CC Copy)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                {isSubmitting ? 'Saving...' : 'Save to Address Book'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-400" /> Edit Contact Details
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditContactSubmit} className="space-y-4 mt-2">
            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Full Legal Name *</Label>
              <Input
                required
                placeholder="e.g. Johan Van Der Merwe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Email Address *</Label>
              <Input
                required
                type="email"
                placeholder="e.g. johan@example.co.za"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Mobile Phone</Label>
              <Input
                type="tel"
                placeholder="e.g. +27 82 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-950 border-slate-700 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Signing Role</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-9 rounded-md bg-slate-950 border border-slate-700 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="signer">Signer (Signs & Fills)</option>
                <option value="approver">Approver (Reviews & Approves)</option>
                <option value="filler">Filler (Fills Fields Only)</option>
                <option value="viewer">Viewer (Receives CC Copy)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                {isSubmitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
