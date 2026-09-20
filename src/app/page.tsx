'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  ShieldCheck,
  Lock,
  Scale,
  Zap,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Users,
  Layers,
  Sparkles,
  QrCode,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="h-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/30">
            🌕
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight leading-none">
              Lunar Sign
            </h1>
            <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase mt-1 block">
              South Africa • ECTA 25 & POPIA 4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/verify">
            <Button variant="outline" size="sm" className="text-xs border-slate-700 hidden sm:flex">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Verify Document
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              Sign Up Business <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 sm:py-24 flex flex-col items-center text-center space-y-8">
        <Badge variant="default" className="px-3.5 py-1 text-xs gap-1.5 border-indigo-500/40 bg-indigo-950/50">
          <Scale className="w-3.5 h-3.5 text-indigo-400" /> Fully Compliant with SA ECTA 25 of 2002 & POPIA 4 of 2013
        </Badge>

        <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl">
          Production E-Signatures for{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            South African Business
          </span>
        </h2>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Self-hosted, tamper-evident document signing. Drag-and-drop fields, automatic DOCX conversion,
          Luhn-validated SA ID numbers, ZAR currency, cryptographic SHA-256 seals, and instant verification.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link href="/dashboard">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-sm font-bold shadow-xl shadow-indigo-600/30 px-8">
              Open Admin Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/s/sample_token">
            <Button size="lg" variant="outline" className="border-slate-700 bg-slate-900/60 text-sm font-semibold px-8 hover:bg-slate-800">
              Try Signer Experience Demo
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-16 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">ECTA 25 & POPIA Legal Compliance</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mandatory electronic consent gate, Schedule 2 exclusions checklist, SARS 10-digit VAT validation,
              and 13-digit SA ID Luhn algorithm checksum.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Tamper-Evident SHA-256 Seals</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              PDF-lib server-side flattening, cryptographic hashing of original and completed artefacts,
              and official Signature Certificates with QR codes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Self-Hosted Handwriting Fonts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Four offline bundled handwriting fonts (Dancing Script, Great Vibes, Caveat, Sacramento)
              with smooth canvas drawing and wet signature background removal.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p>
          Lunar Sign — Production Electronic Signature Platform. Powered by Computer Home Services t/a LunarPOS George.
        </p>
        <p className="text-[11px] text-slate-600">
          This system provides compliance-support workflows and is not a substitute for legal counsel.
        </p>
      </footer>
    </div>
  );
}
