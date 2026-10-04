'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface FieldNavigatorProps {
  currentFieldIndex: number;
  totalFieldsCount: number;
  completedFieldsCount: number;
  missingFieldsCount?: number;
  nextMissingFieldLabel?: string | null;
  onNextField: () => void;
  onPrevField: () => void;
  onFinishSigning: () => void;
  onJumpToMissingField?: () => void;
  isSubmitting?: boolean;
  role?: string;
}

export function FieldNavigator({
  currentFieldIndex,
  totalFieldsCount,
  completedFieldsCount,
  missingFieldsCount = 0,
  nextMissingFieldLabel = null,
  onNextField,
  onPrevField,
  onFinishSigning,
  onJumpToMissingField,
  isSubmitting = false,
  role = 'signer',
}: FieldNavigatorProps) {
  const isApprover = role === 'approver';
  const allCompleted = totalFieldsCount === 0 || (missingFieldsCount === 0 && completedFieldsCount >= totalFieldsCount);
  const progressPct = totalFieldsCount > 0 ? Math.round((completedFieldsCount / totalFieldsCount) * 100) : 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md px-4 py-3 shadow-2xl">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Progress Bar & Status Message */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">
                {totalFieldsCount === 0
                  ? isApprover
                    ? 'Review & Approval Ready'
                    : 'Ready to Submit'
                  : allCompleted
                  ? 'All Required Fields Completed! 🎉'
                  : `${completedFieldsCount} of ${totalFieldsCount} Completed`}
              </span>
              {missingFieldsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {missingFieldsCount} required remaining
                </span>
              )}
            </div>

            <div className="w-44 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  allCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Missing Field Quick-Prompt on mobile */}
          {missingFieldsCount > 0 && nextMissingFieldLabel && (
            <div className="sm:hidden">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onJumpToMissingField || onNextField}
                className="h-7 px-2 text-[10px] border-amber-500/50 text-amber-300 bg-amber-950/40"
              >
                Jump to Field <ArrowRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Navigation & Submission Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Jump to Next Unfilled Field Button (if some are incomplete) */}
          {missingFieldsCount > 0 && onJumpToMissingField && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onJumpToMissingField}
              className="h-9 px-3 text-xs font-semibold border-amber-500/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/50 shadow-md transition-all hidden sm:flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Next Required: <strong className="text-white underline">{nextMissingFieldLabel || 'Field'}</strong></span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          )}

          {totalFieldsCount > 1 && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrevField}
                disabled={currentFieldIndex <= 0}
                className="h-9 px-3 text-xs border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
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
                Next <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {/* Finish / Approve Button */}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onFinishSigning}
            disabled={isSubmitting}
            className={`h-9 px-5 text-xs font-bold text-white shadow-xl transition-all ${
              allCompleted
                ? isApprover
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 ring-2 ring-blue-400/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-400/50 scale-[1.02]'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
            }`}
          >
            {allCompleted ? (
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-white" />
            ) : (
              <AlertCircle className="w-4 h-4 mr-1.5 text-amber-400" />
            )}
            {isSubmitting
              ? isApprover
                ? 'Approving...'
                : 'Finalising...'
              : isApprover
              ? 'Approve & Complete'
              : allCompleted
              ? 'Finish & Submit'
              : `Complete ${missingFieldsCount} Field${missingFieldsCount > 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
