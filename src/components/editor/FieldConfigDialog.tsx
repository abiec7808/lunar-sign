'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DocumentField, Recipient } from '@/types';
import { Trash2, Check, Settings, Type } from 'lucide-react';

interface FieldConfigDialogProps {
  isOpen: boolean;
  field: DocumentField | null;
  recipients: Recipient[];
  onClose: () => void;
  onUpdateField: (updatedField: DocumentField) => void;
  onDeleteField: (fieldId: string) => void;
}

export function FieldConfigDialog({
  isOpen,
  field,
  recipients,
  onClose,
  onUpdateField,
  onDeleteField,
}: FieldConfigDialogProps) {
  const [label, setLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [required, setRequired] = useState(true);
  const [defaultValue, setDefaultValue] = useState('');
  const [fontSize, setFontSize] = useState<string>('auto');
  const [widthPct, setWidthPct] = useState<number>(30);
  const [heightPct, setHeightPct] = useState<number>(3.5);

  useEffect(() => {
    if (field) {
      setLabel(field.label || '');
      setPlaceholder(field.placeholder || '');
      setRecipientId(field.recipient_id || null);
      setRequired(field.required);
      setDefaultValue(field.default_value || '');
      setWidthPct(Number(field.width_pct) || 30);
      setHeightPct(Number(field.height_pct) || 3.5);
      setFontSize((field.validation_rule as any)?.fontSize ? String((field.validation_rule as any).fontSize) : 'auto');
    }
  }, [field]);

  if (!field) return null;

  const handleSave = () => {
    onUpdateField({
      ...field,
      label: label.trim() || undefined,
      placeholder: placeholder.trim() || undefined,
      recipient_id: recipientId,
      required,
      default_value: defaultValue.trim() || undefined,
      width_pct: widthPct,
      height_pct: heightPct,
      validation_rule: {
        ...(field.validation_rule || {}),
        fontSize: fontSize === 'auto' ? undefined : parseInt(fontSize, 10),
      },
    });
    onClose();
  };

  const handleDelete = () => {
    onDeleteField(field.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Field Settings ({field.type.toUpperCase()})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Recipient Assignment */}
          <div>
            <Label className="text-slate-300">Assign Field To Signatory</Label>
            <select
              value={recipientId || ''}
              onChange={(e) => setRecipientId(e.target.value || null)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
            >
              <option value="">Sender (Pre-fill before sending)</option>
              {recipients.map((r, i) => (
                <option key={r.id} value={r.id}>
                  {`Signer ${i + 1}: ${r.name || 'Unnamed'} (${r.email || 'No email'}) - ${r.role || 'signer'}`}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <Label className="text-slate-300">Display Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Client Full Legal Name"
              className="mt-1 bg-slate-950 border-slate-700 text-xs"
            />
          </div>

          {/* Font & Sizing Options */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-slate-300 flex items-center gap-1">
                <Type className="w-3 h-3 text-cyan-400" /> Font Size
              </Label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="mt-1 w-full h-9 px-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none font-sans"
              >
                <option value="auto">Auto Fit (Proportional)</option>
                <option value="8">8 pt</option>
                <option value="9">9 pt</option>
                <option value="10">10 pt</option>
                <option value="11">11 pt</option>
                <option value="12">12 pt (Standard)</option>
                <option value="14">14 pt</option>
                <option value="16">16 pt</option>
                <option value="18">18 pt</option>
                <option value="20">20 pt</option>
                <option value="24">24 pt (Heading)</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-300">Width (%)</Label>
              <Input
                type="number"
                min={5}
                max={100}
                step={0.5}
                value={widthPct}
                onChange={(e) => setWidthPct(parseFloat(e.target.value) || 30)}
                className="mt-1 bg-slate-950 border-slate-700 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-slate-300">Height (%)</Label>
              <Input
                type="number"
                min={2}
                max={50}
                step={0.5}
                value={heightPct}
                onChange={(e) => setHeightPct(parseFloat(e.target.value) || 3.5)}
                className="mt-1 bg-slate-950 border-slate-700 text-xs h-9"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-sans">
            <span className="text-indigo-300 font-semibold block">Font Standardization:</span>
            All filled contract lines use standard clean <strong>Arial</strong> font for evidential legibility.
          </div>

          {/* Required Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-200">Mandatory Field</div>
              <div className="text-[10px] text-slate-400">Signer must complete this placeholder</div>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete} className="bg-red-600/80 hover:bg-red-600 text-xs">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button type="button" variant="default" size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold">
              <Check className="w-3.5 h-3.5 mr-1" /> Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
