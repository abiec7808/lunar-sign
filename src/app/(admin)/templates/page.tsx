'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Plus, FileText, Send, ArrowRight } from 'lucide-react';
import { formatSaDate } from '@/lib/dates';

export default function TemplatesPage() {
  const router = useRouter();

  const mockTemplates = [
    {
      id: 'tpl-001',
      name: 'Standard South African Service Level Agreement (SLA)',
      description: '2-page SLA contract template with pre-configured client signature, SA ID, and fee fields.',
      fieldsCount: 8,
      roles: ['Client / Signer', 'Service Provider'],
      usageCount: 14,
      createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    },
    {
      id: 'tpl-002',
      name: 'Non-Disclosure Agreement (Mutual NDA)',
      description: 'Standard South African mutual confidentiality agreement for commercial engagements.',
      fieldsCount: 4,
      roles: ['Disclosing Party', 'Receiving Party'],
      usageCount: 22,
      createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
    },
    {
      id: 'tpl-003',
      name: 'Employment Contract (Permanent Full-Time)',
      description: 'South African Basic Conditions of Employment Act compliant contract template.',
      fieldsCount: 12,
      roles: ['Employee', 'Employer Representative'],
      usageCount: 9,
      createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
    },
  ];

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
            <Plus className="w-4 h-4 mr-1.5" /> Create Template
          </Button>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockTemplates.map((tpl) => (
            <Card key={tpl.id} className="bg-slate-900/60 border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Copy className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Used {tpl.usageCount} times
                  </Badge>
                </div>
                <CardTitle className="text-base text-white font-bold">{tpl.name}</CardTitle>
                <CardDescription className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {tpl.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">
                    Roles: <strong className="text-slate-200">{tpl.roles.join(', ')}</strong>
                  </div>
                  <div className="text-slate-400">
                    Fields: <strong className="text-slate-200">{tpl.fieldsCount} placed fields</strong>
                  </div>
                </div>

                <Button
                  onClick={() => router.push('/documents/new')}
                  className="w-full bg-slate-800 hover:bg-indigo-600 text-xs font-semibold text-white transition-colors"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Use Template (2 Clicks)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
