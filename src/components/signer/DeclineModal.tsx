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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, AlertTriangle } from 'lucide-react';

interface DeclineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDecline: (reason: string) => Promise<void>;
  documentTitle: string;
}

export function DeclineModal({
  isOpen,
  onClose,
  onConfirmDecline,
  documentTitle,
}: DeclineModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDecline = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirmDecline(reason.trim());
      onClose();
    } catch (err) {
      console.error('Failed to decline:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
            <XCircle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold">Decline to Sign</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Declining this document will stop the signing workflow and immediately notify the sender.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>
              This action is permanent and will invalidate the signing session for <strong>"{documentTitle}"</strong>.
            </span>
          </div>

          <div>
            <Label className="text-slate-300">Reason for declining (mandatory)</Label>
            <Textarea
              rows={3}
              placeholder="Please explain why you are declining to sign this document..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 bg-slate-950 border-slate-700 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDecline}
            disabled={!reason.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-500"
          >
            {isSubmitting ? 'Declining...' : 'Confirm Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
