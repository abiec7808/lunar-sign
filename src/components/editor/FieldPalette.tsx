'use client';

import React from 'react';
import { FieldType } from '@/types';
import {
  PenTool,
  Type,
  User,
  Mail,
  Calendar,
  FileText,
  Hash,
  DollarSign,
  CreditCard,
  Building,
  CheckSquare,
  List,
  Paperclip,
} from 'lucide-react';

interface PaletteItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
  category: 'signature' | 'standard' | 'south_africa' | 'advanced';
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Signature & Identifiers
  { type: 'signature', label: 'Signature', icon: <PenTool className="w-4 h-4" />, category: 'signature' },
  { type: 'initials', label: 'Initials', icon: <Type className="w-4 h-4" />, category: 'signature' },
  { type: 'full_name', label: 'Full Name', icon: <User className="w-4 h-4" />, category: 'standard' },
  { type: 'email', label: 'Email Address', icon: <Mail className="w-4 h-4" />, category: 'standard' },
  { type: 'date_signed', label: 'Date Signed', icon: <Calendar className="w-4 h-4" />, category: 'standard' },

  // South African Compliance
  { type: 'sa_id', label: 'SA ID Number (13-Digit)', icon: <CreditCard className="w-4 h-4" />, category: 'south_africa' },
  { type: 'sa_vat', label: 'SA VAT Number', icon: <Building className="w-4 h-4" />, category: 'south_africa' },
  { type: 'currency', label: 'ZAR Currency (R)', icon: <DollarSign className="w-4 h-4" />, category: 'south_africa' },

  // Standard Inputs
  { type: 'text', label: 'Text Field', icon: <FileText className="w-4 h-4" />, category: 'standard' },
  { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, category: 'standard' },
  { type: 'date_picker', label: 'Date Picker', icon: <Calendar className="w-4 h-4" />, category: 'standard' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" />, category: 'standard' },
  { type: 'dropdown', label: 'Dropdown Menu', icon: <List className="w-4 h-4" />, category: 'advanced' },
  { type: 'attachment', label: 'Attachment Upload', icon: <Paperclip className="w-4 h-4" />, category: 'advanced' },
];

interface FieldPaletteProps {
  onAddField: (type: FieldType) => void;
  activeRecipientName?: string;
  activeColor?: string;
}

export function FieldPalette({ onAddField, activeRecipientName = 'Recipient', activeColor = '#6366f1' }: FieldPaletteProps) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col h-full overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          Field Toolbox
        </h3>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeColor }} />
          <span className="text-slate-300 truncate">Assigning to: <strong>{activeRecipientName}</strong></span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Signatures & Roles
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {PALETTE_ITEMS.filter((i) => i.category === 'signature').map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => onAddField(item.type)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500 hover:bg-slate-800 text-xs text-slate-200 transition-all text-left group"
              >
                <span className="text-indigo-400 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
            🇿🇦 South African Fields
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {PALETTE_ITEMS.filter((i) => i.category === 'south_africa').map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => onAddField(item.type)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-950/70 border border-emerald-900/50 hover:border-emerald-500 hover:bg-slate-800 text-xs text-slate-200 transition-all text-left group"
              >
                <span className="text-emerald-400 group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Standard Inputs
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {PALETTE_ITEMS.filter((i) => i.category === 'standard' || i.category === 'advanced').map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => onAddField(item.type)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-600 hover:bg-slate-800 text-xs text-slate-200 transition-all text-left group"
              >
                <span className="text-slate-400 group-hover:text-white group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
