'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Copy,
  Plus,
  FileText,
  Send,
  Trash2,
  Layers,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Edit3,
  Upload,
  Check,
  LayoutTemplate,
} from 'lucide-react';
import { formatSaDate } from '@/lib/dates';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Use Template Modal State
  const [selectedTemplateForUse, setSelectedTemplateForUse] = useState<any | null>(null);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [customDocMessage, setCustomDocMessage] = useState('');

  // Edit Template Modal State
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPdfBase64, setEditPdfBase64] = useState<string | null>(null);
  const [editPdfFileName, setEditPdfFileName] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openEditModal = (tpl: any) => {
    setEditingTemplate(tpl);
    setEditName(tpl.name || '');
    setEditDescription(tpl.description || '');
    setEditPdfBase64(null);
    setEditPdfFileName('');
  };

  const handlePdfUploadForEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      setEditPdfBase64(base64);
      setEditPdfFileName(file.name);
    } catch (err) {
      console.error('Failed to read new PDF:', err);
      alert('Could not read PDF file.');
    }
  };

  const handleSaveTemplateEdit = async () => {
    if (!editingTemplate) return;
    if (!editName.trim()) {
      alert('Template name is required.');
      return;
    }

    try {
      setIsUpdating(true);
      const payload: any = {
        name: editName.trim(),
        description: editDescription.trim(),
      };

      if (editPdfBase64) {
        payload.pdfBase64 = editPdfBase64;
        payload.originalFilename = editPdfFileName || 'template.pdf';
      }

      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setNotification(`Template "${editName.trim()}" updated successfully!`);
        setTimeout(() => setNotification(null), 5000);
        setEditingTemplate(null);
        await loadTemplates();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update template.');
      }
    } catch (err) {
      console.error('Error updating template:', err);
      alert('An unexpected error occurred.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setNotification(`Template "${name}" was deleted.`);
        setTimeout(() => setNotification(null), 4000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('An unexpected error occurred while deleting template.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="Reusable Envelope Templates"
        subtitle="Create, edit, and manage reusable contract and agreement templates with pre-configured signature placements."
        actionButton={
          <Button
            onClick={() => router.push('/documents/new')}
            className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create New Template
          </Button>
        }
      />

      <div className="p-6 sm:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {notification && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center justify-between animate-in fade-in-0">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-500">Loading custom templates...</div>
        ) : templates.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800 text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Custom Templates Saved Yet</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
              Save your frequent agreements as reusable templates with pre-placed signatures, initials, and South African compliance fields to dispatch envelopes in seconds.
            </p>
            <Button
              onClick={() => router.push('/documents/new')}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Your First Template
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              let parsedFieldsCount = 0;
              try {
                const defs = typeof tpl.field_definitions === 'string' ? JSON.parse(tpl.field_definitions) : tpl.field_definitions;
                parsedFieldsCount = Array.isArray(defs) ? defs.length : Array.isArray(defs?.fields) ? defs.fields.length : 0;
              } catch (e) {}

              let parsedRoles: string[] = ['Signer'];
              try {
                const rDefs = typeof tpl.recipient_roles === 'string' ? JSON.parse(tpl.recipient_roles) : tpl.recipient_roles;
                if (Array.isArray(rDefs) && rDefs.length > 0) {
                  parsedRoles = rDefs.map((r: any, idx: number) => {
                    const role = r.role || 'Signer';
                    return role.charAt(0).toUpperCase() + role.slice(1);
                  });
                }
              } catch (e) {}

              return (
                <Card
                  key={tpl.id}
                  className="bg-slate-900/60 border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors group"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <LayoutTemplate className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Used {tpl.usage_count || 0} times
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(tpl)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
                          title="Edit template details and fields"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-base text-white font-bold">{tpl.name}</CardTitle>
                    <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {tpl.description || 'Pre-configured document template ready for quick reuse.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Roles:</span>
                        <strong className="text-slate-200 truncate max-w-[160px]">{parsedRoles.join(', ')}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Fields:</span>
                        <strong className="text-slate-200">{parsedFieldsCount} configured</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-900 text-[11px]">
                        <span>Updated:</span>
                        <span className="font-mono text-slate-400">{formatSaDate(tpl.updated_at || tpl.created_at)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => openEditModal(tpl)}
                        className="w-full border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Edit Template
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedTemplateForUse(tpl);
                          setCustomDocTitle(tpl.name || '');
                          setCustomDocMessage(tpl.description || 'Please review and sign this agreement.');
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-lg shadow-indigo-600/25"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Template Modal */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Edit Template: {editingTemplate?.name}
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update template name, description, replace the PDF, or edit field placements.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-200">Template Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Service Level Agreement (SLA)"
                className="mt-1.5 bg-slate-950 border-slate-700 text-xs text-white font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-200">Description</Label>
              <Textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description or purpose of this template..."
                className="mt-1.5 bg-slate-950 border-slate-700 text-xs text-slate-200"
              />
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300">Replace Base PDF File (Optional)</Label>
                {editPdfFileName && (
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                    New File Selected
                  </Badge>
                )}
              </div>
              <label className="flex flex-col items-center justify-center border border-dashed border-slate-700 rounded-lg p-3 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-[11px] text-slate-300 font-medium">
                  {editPdfFileName ? editPdfFileName : 'Click to upload a replacement PDF'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">PDF format supported</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfUploadForEdit}
                />
              </label>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!editingTemplate) return;
                  router.push(`/documents/new?templateId=${editingTemplate.id}&mode=edit_template`);
                }}
                className="w-full border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" /> Open in Visual Field Editor (Signatures & Fields)
              </Button>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTemplate(null)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isUpdating}
              onClick={handleSaveTemplateEdit}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25"
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Template Modal: Custom Document Naming (e.g. SLA - CHS, SLA - SPAR) */}
      <Dialog open={!!selectedTemplateForUse} onOpenChange={(open) => { if (!open) setSelectedTemplateForUse(null); }}>
        <DialogContent className="max-w-lg bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">
                  Prepare Document from Template
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Template: <strong className="text-slate-200">{selectedTemplateForUse?.name}</strong>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-3 space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-200">
                Custom Document / Agreement Title <span className="text-indigo-400 font-normal">(e.g. SLA - CHS, SLA - SPAR)</span>
              </Label>
              <Input
                value={customDocTitle}
                onChange={(e) => setCustomDocTitle(e.target.value)}
                placeholder="e.g. SLA - CHS or SLA - SPAR"
                className="mt-1.5 bg-slate-950 border-slate-700 text-xs text-white font-semibold placeholder:text-slate-500 shadow-inner"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                This custom name will be listed under your Documents dashboard, stamped on certificates, and easily searchable.
              </span>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-200">Message to Signatories (Optional)</Label>
              <Textarea
                rows={2}
                value={customDocMessage}
                onChange={(e) => setCustomDocMessage(e.target.value)}
                placeholder="Add custom instructions or a note for the client..."
                className="mt-1.5 bg-slate-950 border-slate-700 text-xs text-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTemplateForUse(null)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!selectedTemplateForUse) return;
                const title = customDocTitle.trim() || selectedTemplateForUse.name || 'Contract Agreement';
                const msg = customDocMessage.trim();
                router.push(
                  `/documents/new?templateId=${selectedTemplateForUse.id}&title=${encodeURIComponent(title)}&message=${encodeURIComponent(msg)}`
                );
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25"
            >
              Launch & Add Signers <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


