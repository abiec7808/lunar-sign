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
import { AlertOctagon, Scale, ShieldAlert, Check } from 'lucide-react';
import { ECTA_SCHEDULE_2_EXCLUSIONS, ECTA_SPECIAL_FORMALITY_NOTICE } from '@/lib/compliance/ecta';

interface EctaExclusionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCompliance: () => void;
}

export function EctaExclusionsModal({
  isOpen,
  onClose,
  onConfirmCompliance,
}: EctaExclusionsModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
            <Scale className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            South African ECTA Schedule 2 Exclusions Checklist
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Before creating or sending an electronic envelope, South African law requires confirming
            that this transaction is not legally excluded from electronic signatures.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2 max-h-[50vh] overflow-y-auto pr-1">
          <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              Under <strong>Section 4(3) and Schedule 2 of the Electronic Communications and Transactions Act 25 of 2002</strong>,
              the following documents CANNOT be executed via electronic signature:
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {ECTA_SCHEDULE_2_EXCLUSIONS.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                <div className="font-bold text-slate-100 flex items-center justify-between">
                  <span>❌ {item.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{item.act}</span>
                </div>
                <div className="text-slate-400 mt-1 text-[11px]">{item.description}</div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>{ECTA_SPECIAL_FORMALITY_NOTICE}</span>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/20">
            <Checkbox
              id="acknowledgement"
              checked={acknowledged}
              onCheckedChange={(c) => setAcknowledged(!!c)}
              className="mt-0.5"
            />
            <label htmlFor="acknowledgement" className="text-xs text-slate-200 cursor-pointer select-none font-medium leading-relaxed">
              I certify that this document is not a Will, Sale of Land Agreement, Long-term Lease exceeding 20 years,
              or Bill of Exchange, and is legally valid for execution under ECTA 25 of 2002.
            </label>
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!acknowledged}
            onClick={() => {
              onConfirmCompliance();
              onClose();
            }}
            className="bg-indigo-600 hover:bg-indigo-500"
          >
            <Check className="w-4 h-4 mr-1.5" /> Confirm & Proceed to Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
