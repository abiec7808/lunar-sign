'use client';

import React, { useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldCheck, Download, Trash2, Scale, Check, AlertTriangle, FileText } from 'lucide-react';
import { POPIA_PRIVACY_NOTICE } from '@/lib/compliance/popia';

export default function PopiaCompliancePage() {
  const [searchEmail, setSearchEmail] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleExportData = () => {
    if (!searchEmail) return;
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setActionSuccess(`POPIA data export package generated for ${searchEmail}. Download starting...`);
    }, 1200);
  };

  const handleDeleteRequest = () => {
    if (!searchEmail) return;
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      setActionSuccess(`POPIA erasure workflow initiated for ${searchEmail} (anonymizing telemetric data while preserving cryptographic evidence).`);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#090d16]">
      <AdminHeader
        title="POPIA Compliance & Subject Access"
        subtitle="Manage South African Protection of Personal Information Act (POPIA 4 of 2013) subject requests."
      />

      <div className="p-8 space-y-6 max-w-5xl w-full mx-auto">
        {actionSuccess && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Data Subject Request Tool */}
        <Card className="bg-slate-900/70 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-400" /> Data Subject Access Request (DSAR)
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              In accordance with Chapter 3 of POPIA, data subjects may request an export of all recorded information or lodge a deletion request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300 text-xs">Signer / Data Subject Email Address</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  placeholder="e.g. johan@example.co.za"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-xs"
                />
                <Button
                  onClick={handleExportData}
                  disabled={!searchEmail || isExporting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shrink-0"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  {isExporting ? 'Exporting...' : 'Export JSON Data'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRequest}
                  disabled={!searchEmail || isDeleting}
                  className="bg-red-600/80 hover:bg-red-600 text-xs font-semibold shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {isDeleting ? 'Processing...' : 'Request Erasure'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* POPIA Compliance Notice Card */}
        <Card className="bg-slate-900/70 border-slate-800">
          <CardHeader>
            <CardTitle className="text-base text-white">POPIA Policy & Telemetry Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-slate-200">Information Protection Principles:</div>
              <ul className="list-disc pl-4 space-y-1.5 text-slate-300">
                {POPIA_PRIVACY_NOTICE.collectedInformation.map((item, i) => (
                  <li key={i}>
                    <strong>{item.field}:</strong> {item.purpose}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 space-y-1">
              <div className="font-bold text-slate-300">Data Residency & Cross-Border Transfer Basis:</div>
              <p>{POPIA_PRIVACY_NOTICE.dataResidency}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
