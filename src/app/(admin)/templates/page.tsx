'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, FileText, Send, Trash2, Layers, Clock, AlertCircle } from 'lucide-react';
import { formatSaDate } from '@/lib/dates';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

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
        subtitle="Create reusable contract and agreement templates with pre-configured field placements."
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
                  parsedRoles = rDefs.map((r: any) => r.name || r.role || 'Signer');
                }
              } catch (e) {}

              return (
                <Card
                  key={tpl.id}
                  className="bg-slate-900/60 border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Copy className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Used {tpl.usage_count || 0} times
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="h-6 w-6 p-0 text-slate-500 hover:text-red-400"
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
                        <span>Created:</span>
                        <span className="font-mono text-slate-400">{formatSaDate(tpl.created_at)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => router.push(`/documents/new?templateId=${tpl.id}`)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-lg shadow-indigo-600/25"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" /> Use Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

