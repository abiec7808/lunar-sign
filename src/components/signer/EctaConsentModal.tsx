'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { ECTA_SIGNER_CONSENT_TEXT } from '@/lib/compliance/ecta';
import { POPIA_SIGNER_CONSENT_STATEMENT, POPIA_PRIVACY_NOTICE } from '@/lib/compliance/popia';

interface EctaConsentModalProps {
  isOpen: boolean;
  documentTitle: string;
  senderName: string;
  onAcceptConsent: () => void;
}

export function EctaConsentModal({
  isOpen,
  documentTitle,
  senderName,
  onAcceptConsent,
}: EctaConsentModalProps) {
  const [ectaConsentChecked, setEctaConsentChecked] = useState(false);
  const [popiaConsentChecked, setPopiaConsentChecked] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const canProceed = ectaConsentChecked && popiaConsentChecked;

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white shadow-2xl p-6 sm:rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Electronic Signature & POPIA Consent Gate
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            In compliance with the South African Electronic Communications and Transactions Act 25 of 2002
            and the Protection of Personal Information Act 4 of 2013.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              Document: {documentTitle}
            </div>
            <div className="text-slate-400">
              Sender: <span className="text-slate-200">{senderName}</span>
            </div>
          </div>

          {/* 1. ECTA Consent Checkbox */}
          <div className="flex items-start space-x-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 transition-colors">
            <Checkbox
              id="ecta-consent"
              checked={ectaConsentChecked}
              onCheckedChange={(checked) => setEctaConsentChecked(!!checked)}
              className="mt-0.5"
            />
            <label htmlFor="ecta-consent" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
              <strong className="text-white block mb-0.5">ECTA 25 of 2002 Electronic Consent:</strong>
              {ECTA_SIGNER_CONSENT_TEXT}
            </label>
          </div>

          {/* 2. POPIA Privacy Consent Checkbox */}
          <div className="flex items-start space-x-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950/70 transition-colors">
            <Checkbox
              id="popia-consent"
              checked={popiaConsentChecked}
              onCheckedChange={(checked) => setPopiaConsentChecked(!!checked)}
              className="mt-0.5"
            />
            <label htmlFor="popia-consent" className="text-xs text-slate-300 leading-relaxed cursor-pointer select-none">
              <strong className="text-white block mb-0.5">POPIA Privacy & Telemetry Acknowledgment:</strong>
              {POPIA_SIGNER_CONSENT_STATEMENT}
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
          >
            {showPrivacyDetails ? 'Hide POPIA Data Collection Summary' : 'View POPIA Data Collection Summary'}
          </button>

          {showPrivacyDetails && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="font-bold text-slate-200">{POPIA_PRIVACY_NOTICE.title}</div>
              <ul className="list-disc pl-4 space-y-1">
                {POPIA_PRIVACY_NOTICE.collectedInformation.map((item, i) => (
                  <li key={i}>
                    <strong className="text-slate-300">{item.field}:</strong> {item.purpose}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            disabled={!canProceed}
            onClick={onAcceptConsent}
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-2.5 rounded-xl disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Accept & Unlock Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
