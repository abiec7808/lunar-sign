'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface FieldNavigatorProps {
  currentFieldIndex: number;
  totalFieldsCount: number;
  completedFieldsCount: number;
  onNextField: () => void;
  onPrevField: () => void;
  onFinishSigning: () => void;
  isSubmitting?: boolean;
  role?: string;
}

export function FieldNavigator({
  currentFieldIndex,
  totalFieldsCount,
  completedFieldsCount,
  onNextField,
  onPrevField,
  onFinishSigning,
  isSubmitting = false,
  role = 'signer',
}: FieldNavigatorProps) {
  const isApprover = role === 'approver';
  const allCompleted = totalFieldsCount === 0 || completedFieldsCount >= totalFieldsCount;
  const progressPct = totalFieldsCount > 0 ? Math.round((completedFieldsCount / totalFieldsCount) * 100) : 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-4 py-3 shadow-2xl">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        {/* Progress Bar & Counter */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-slate-200">
              {totalFieldsCount === 0
                ? isApprover
                  ? 'Review & Approval Ready'
                  : 'Ready to Submit'
                : `Fields Completed: ${completedFieldsCount} of ${totalFieldsCount}`}
            </span>
            <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono sm:hidden">
            {totalFieldsCount === 0
              ? isApprover
                ? 'Approve'
                : 'Ready'
              : `${completedFieldsCount}/${totalFieldsCount} Done`}
          </span>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          {totalFieldsCount > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrevField}
                disabled={currentFieldIndex <= 0}
                className="h-9 px-3 text-xs"
              >
                <ChevronUp className="w-4 h-4 mr-1" /> Prev
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onNextField}
                disabled={currentFieldIndex >= totalFieldsCount - 1}
                className="h-9 px-3 text-xs font-semibold bg-slate-800 text-indigo-300 hover:bg-slate-700"
              >
                Next Field <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {/* Finish / Approve Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onFinishSigning}
            disabled={!allCompleted || isSubmitting}
            className={`h-9 px-5 text-xs font-bold text-white shadow-lg disabled:opacity-40 transition-all ${
              isApprover
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isSubmitting
              ? isApprover
                ? 'Approving...'
                : 'Finalising...'
              : isApprover
              ? 'Approve & Complete'
              : 'Finish & Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
