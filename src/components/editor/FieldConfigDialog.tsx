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
import {
  Trash2,
  Check,
  Settings,
  Type,
  List,
  Plus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlignLeft,
  X,
} from 'lucide-react';

interface FieldConfigDialogProps {
  isOpen: boolean;
  field: DocumentField | null;
  recipients: Recipient[];
  onClose: () => void;
  onUpdateField: (updatedField: DocumentField) => void;
  onDeleteField: (fieldId: string) => void;
}

const PRESET_OPTIONS: { name: string; options: string[] }[] = [
  { name: 'Yes / No / N/A', options: ['Yes', 'No', 'Not Applicable'] },
  { name: 'SA Provinces', options: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'] },
  { name: 'Approval Status', options: ['Approved', 'Pending Review', 'Rejected'] },
  { name: 'Payment Terms', options: ['Immediate', 'Net 15 Days', 'Net 30 Days', 'Net 60 Days'] },
  { name: 'Title / Salutation', options: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'] },
];

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
  const [value, setValue] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [fontSize, setFontSize] = useState<string>('auto');
  const [widthPct, setWidthPct] = useState<number>(30);
  const [heightPct, setHeightPct] = useState<number>(3.5);

  // Dropdown / Radio Options
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkOptionsText, setBulkOptionsText] = useState('');

  useEffect(() => {
    if (field) {
      setLabel(field.label || '');
      setPlaceholder(field.placeholder || '');
      setRecipientId(field.recipient_id || null);
      setRequired(field.required);
      setValue(field.value || field.default_value || '');
      setDefaultValue(field.default_value || '');
      setWidthPct(Number(field.width_pct) || (field.type === 'dropdown' ? 30 : 30));
      setHeightPct(Number(field.height_pct) || (field.type === 'dropdown' ? 3.5 : 3.5));
      setFontSize((field.validation_rule as any)?.fontSize ? String((field.validation_rule as any).fontSize) : 'auto');

      // Initialize dropdown options
      if (field.type === 'dropdown' || field.type === 'radio') {
        const initialOpts = Array.isArray(field.options) && field.options.length > 0
          ? field.options
          : ['Option 1', 'Option 2', 'Option 3'];
        setOptions(initialOpts);
        setBulkOptionsText(initialOpts.join('\n'));
      } else {
        setOptions([]);
        setBulkOptionsText('');
      }
      setNewOptionInput('');
      setIsBulkMode(false);
    }
  }, [field]);

  if (!field) return null;

  const isDropdownOrRadio = field.type === 'dropdown' || field.type === 'radio';

  // Option actions
  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (!options.includes(trimmed)) {
      const updated = [...options, trimmed];
      setOptions(updated);
      setBulkOptionsText(updated.join('\n'));
    }
    setNewOptionInput('');
  };

  const handleKeyDownAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleUpdateOption = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
    setBulkOptionsText(updated.join('\n'));
  };

  const handleRemoveOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    setBulkOptionsText(updated.join('\n'));
    if (value === options[index]) {
      setValue('');
    }
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setOptions(updated);
    setBulkOptionsText(updated.join('\n'));
  };

  const handleApplyBulkOptions = () => {
    const parsed = bulkOptionsText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const unique = Array.from(new Set(parsed));
    if (unique.length > 0) {
      setOptions(unique);
    }
    setIsBulkMode(false);
  };

  const handleApplyPreset = (presetOpts: string[]) => {
    setOptions(presetOpts);
    setBulkOptionsText(presetOpts.join('\n'));
    setIsBulkMode(false);
  };

  const handleSave = () => {
    const cleanOptions = isDropdownOrRadio
      ? options.map((o) => o.trim()).filter((o) => o.length > 0)
      : undefined;

    const finalOptions = cleanOptions && cleanOptions.length > 0 ? cleanOptions : isDropdownOrRadio ? ['Option 1', 'Option 2', 'Option 3'] : undefined;

    onUpdateField({
      ...field,
      label: label.trim() || undefined,
      placeholder: placeholder.trim() || undefined,
      recipient_id: recipientId,
      required,
      options: finalOptions,
      value: value.trim() || undefined,
      default_value: value.trim() || defaultValue.trim() || undefined,
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
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Field Settings ({field.type.toUpperCase()})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Recipient Assignment */}
          <div>
            <Label className="text-slate-300 text-xs">Assign Field To Signatory</Label>
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
            <Label className="text-slate-300 text-xs">Display Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isDropdownOrRadio ? 'e.g. Select Province / Payment Method' : 'e.g. Client Full Legal Name'}
              className="mt-1 bg-slate-950 border-slate-700 text-xs"
            />
          </div>

          {/* Dedicated Options Section for Dropdown and Radio fields */}
          {isDropdownOrRadio && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-900/40 shadow-inner space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                  <List className="w-4 h-4 text-cyan-400" />
                  <span>Dropdown Options ({options.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBulkOptionsText(options.join('\n'));
                    setIsBulkMode(!isBulkMode);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1 transition-colors"
                >
                  <AlignLeft className="w-3 h-3" />
                  {isBulkMode ? 'Simple List View' : 'Bulk Paste / Edit'}
                </button>
              </div>

              {/* Preset Shortcuts */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Presets:
                </span>
                {PRESET_OPTIONS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset.options)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Bulk Mode Textarea */}
              {isBulkMode ? (
                <div className="space-y-2">
                  <Label className="text-[11px] text-slate-400">
                    Enter one option per line or comma-separated:
                  </Label>
                  <textarea
                    value={bulkOptionsText}
                    onChange={(e) => setBulkOptionsText(e.target.value)}
                    rows={5}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsBulkMode(false)}
                      className="h-7 text-xs border-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplyBulkOptions}
                      className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                      Apply Options
                    </Button>
                  </div>
                </div>
              ) : (
                /* Interactive Option List */
                <div className="space-y-2">
                  {/* Add Option Input Bar */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={handleKeyDownAdd}
                      placeholder="Type an option name & press Enter..."
                      className="bg-slate-900 border-slate-700 text-xs h-8 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddOption}
                      disabled={!newOptionInput.trim()}
                      className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>

                  {/* Options List items */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {options.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500 italic">
                        No options added yet. Type an option above or pick a preset.
                      </div>
                    ) : (
                      options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                        >
                          <span className="w-5 h-5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(idx, e.target.value)}
                            className="bg-transparent border-none text-xs text-slate-100 flex-1 px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded"
                            placeholder="Option text..."
                          />
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveOption(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOption(idx, 'down')}
                              disabled={idx === options.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors ml-1"
                              title="Remove Option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Preselected / Default Value */}
                  {options.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <Label className="text-slate-400 text-xs">Default Selection (Optional):</Label>
                      <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="h-7 px-2 rounded-md border border-slate-700 bg-slate-900 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-none max-w-[200px]"
                      >
                        <option value="">None (Empty prompt)</option>
                        {options.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pre-filled Text / Value for standard fields */}
          {!isDropdownOrRadio && field.type !== 'signature' && field.type !== 'initials' && (
            <div>
              <Label className="text-slate-300 text-xs">Pre-filled Text / Value (Sender Input)</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter prefilled text (e.g. R 15,000 / Contract Date / Terms)..."
                className="mt-1 bg-slate-950 border-slate-700 text-xs text-white"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {recipientId === null || !recipientId
                  ? 'This text will be permanently stamped on the document before signers receive it.'
                  : 'Default text pre-populated for this signatory to review or complete.'}
              </span>
            </div>
          )}

          {/* Font & Sizing Options */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-slate-300 text-xs flex items-center gap-1">
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
              <Label className="text-slate-300 text-xs">Width (%)</Label>
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
              <Label className="text-slate-300 text-xs">Height (%)</Label>
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
            <span className="text-indigo-300 font-semibold block">Standardization & Security:</span>
            All fields use verified legal fonts for evidential legibility and POPIA / ECTA compliance.
          </div>

          {/* Required Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-200">Mandatory Field</div>
              <div className="text-[10px] text-slate-400">Signer must make a selection / complete this field</div>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="bg-red-600/80 hover:bg-red-600 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Apply Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
