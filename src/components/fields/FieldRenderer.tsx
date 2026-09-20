'use client';

import React from 'react';
import { DocumentField, Recipient } from '@/types';
import { cn } from '@/lib/utils';
import { validateSaId } from '@/lib/compliance/sa-id';
import { validateSaVat } from '@/lib/compliance/sa-vat';
import { formatSaDate } from '@/lib/dates';
import {
  PenTool,
  Calendar,
  Mail,
  User,
  Hash,
  DollarSign,
  CreditCard,
  Building,
  CheckSquare,
  List,
  Paperclip,
  Type,
  FileText,
} from 'lucide-react';

interface FieldRendererProps {
  field: DocumentField;
  recipient?: Recipient | null;
  mode: 'editor' | 'signer' | 'readonly';
  isSelected?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onOpenSignatureModal?: (fieldId: string) => void;
  onSelectField?: (field: DocumentField) => void;
  signatureData?: string;
}

export function FieldRenderer({
  field,
  recipient,
  mode,
  isSelected = false,
  value = field.value || '',
  onChange,
  onOpenSignatureModal,
  onSelectField,
  signatureData,
}: FieldRendererProps) {
  const isSignerMode = mode === 'signer';
  const isEditorMode = mode === 'editor';
  const recipientColor = recipient?.color || '#6366f1';

  // Explicit or auto-calculated font size
  const customFontSize = (field.validation_rule as any)?.fontSize || (field.value_meta as any)?.fontSize;
  
  // Dynamic auto font size based on field dimensions if not overridden
  const heightVal = Number(field.height_pct) || 3.5;
  const autoFontSize = Math.max(9, Math.min(16, Math.round(heightVal * 2.8)));
  const effectiveFontSize = customFontSize ? `${customFontSize}px` : `${autoFontSize}px`;

  // Strict Arial font family with pure crisp black font color for all filled lines
  const arialFontStyle: React.CSSProperties = {
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    fontSize: effectiveFontSize,
    color: '#000000',
  };

  // Validation warnings
  let validationError = '';
  if (isSignerMode && value) {
    if (field.type === 'sa_id') {
      const saIdRes = validateSaId(value);
      if (!saIdRes.isValid) validationError = saIdRes.error || 'Invalid SA ID';
    } else if (field.type === 'sa_vat') {
      const vatRes = validateSaVat(value);
      if (!vatRes.isValid) validationError = vatRes.error || 'Invalid VAT Number';
    }
  }

  const renderIcon = () => {
    switch (field.type) {
      case 'signature':
        return <PenTool className="w-3 h-3" />;
      case 'initials':
        return <Type className="w-3 h-3" />;
      case 'full_name':
        return <User className="w-3 h-3" />;
      case 'email':
        return <Mail className="w-3 h-3" />;
      case 'date_signed':
      case 'date_picker':
        return <Calendar className="w-3 h-3" />;
      case 'currency':
        return <DollarSign className="w-3 h-3" />;
      case 'sa_id':
        return <CreditCard className="w-3 h-3" />;
      case 'sa_vat':
        return <Building className="w-3 h-3" />;
      case 'checkbox':
        return <CheckSquare className="w-3 h-3" />;
      case 'dropdown':
      case 'radio':
        return <List className="w-3 h-3" />;
      case 'attachment':
        return <Paperclip className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  // 1. In Editor Mode: Display crisp placeholder box on white contract page with pure black text
  if (isEditorMode) {
    return (
      <div
        onClick={() => onSelectField?.(field)}
        className={cn(
          'w-full h-full flex items-center justify-between px-1.5 py-0.5 rounded border-2 select-none cursor-pointer transition-all font-semibold overflow-hidden shadow-sm',
          isSelected ? 'ring-2 ring-indigo-600 shadow-lg z-30 scale-[1.01]' : 'opacity-95 hover:opacity-100'
        )}
        style={{
          borderColor: recipientColor,
          backgroundColor: '#ffffff',
          color: '#000000',
          ...arialFontStyle,
        }}
      >
        <span className="flex items-center gap-1 font-bold truncate text-[11px] text-slate-950">
          <span style={{ color: recipientColor }}>{renderIcon()}</span>
          <span className="truncate">{field.label || field.type.toUpperCase()}</span>
          {field.required && <span className="text-red-600 font-bold ml-0.5">*</span>}
        </span>
        <span className="truncate text-[10px] font-medium text-slate-600 ml-1 hidden sm:inline">
          {recipient ? recipient.name.split(' ')[0] : 'Sender'}
        </span>
      </div>
    );
  }

  // 2. In Signer Mode: Interactive inputs with pure Arial font
  switch (field.type) {
    case 'signature':
    case 'initials':
      return (
        <div
          onClick={() => onOpenSignatureModal?.(field.id)}
          className={cn(
            'w-full h-full rounded border-2 border-dashed flex items-center justify-center cursor-pointer transition-all px-2 py-0.5',
            value || signatureData
              ? 'border-indigo-400 bg-indigo-950/40 text-white'
              : 'border-indigo-500 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-200 animate-pulse'
          )}
        >
          {signatureData || value ? (
            signatureData?.startsWith('data:image') || value?.startsWith('data:image') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureData || value}
                alt="Signature"
                className="max-h-full max-w-full object-contain filter drop-shadow"
              />
            ) : (
              <span className="font-dancing-script text-lg text-indigo-300 select-none">
                {signatureData || value}
              </span>
            )
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-semibold" style={arialFontStyle}>
              <PenTool className="w-3 h-3" />
              <span>Click to {field.type === 'initials' ? 'Initial' : 'Sign'}</span>
            </div>
          )}
        </div>
      );

    case 'checkbox':
      const isChecked = value === 'true' || value === '1';
      return (
        <div
          onClick={() => onChange?.(isChecked ? 'false' : 'true')}
          className={cn(
            'w-full h-full rounded border flex items-center justify-center cursor-pointer transition-colors',
            isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 hover:border-slate-500'
          )}
        >
          {isChecked && <span className="font-bold text-xs">✓</span>}
        </div>
      );

    case 'currency':
      return (
        <div className="w-full h-full relative flex items-center">
          <input
            type="text"
            placeholder="R 0,00"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            style={{ ...arialFontStyle, color: '#000000', backgroundColor: '#ffffff' }}
            className="w-full h-full px-1.5 py-0 rounded border border-slate-400 bg-white text-black font-semibold focus:ring-1 focus:ring-indigo-600 outline-none leading-none shadow-sm placeholder:text-slate-400"
          />
        </div>
      );

    case 'sa_id':
      return (
        <div className="w-full h-full flex flex-col justify-center relative">
          <input
            type="text"
            maxLength={13}
            placeholder="13-digit SA ID"
            value={value}
            onChange={(e) => onChange?.(e.target.value.replace(/\D/g, ''))}
            style={{ ...arialFontStyle, color: '#000000', backgroundColor: '#ffffff' }}
            className={cn(
              'w-full h-full px-1.5 py-0 rounded border bg-white text-black font-semibold focus:outline-none focus:ring-1 leading-none shadow-sm placeholder:text-slate-400',
              validationError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-400 focus:ring-indigo-600'
            )}
          />
          {validationError && (
            <span className="text-[9px] text-red-600 font-bold absolute -bottom-3.5 left-0 truncate max-w-full font-sans">
              {validationError}
            </span>
          )}
        </div>
      );

    case 'sa_vat':
      return (
        <div className="w-full h-full flex flex-col justify-center relative">
          <input
            type="text"
            maxLength={10}
            placeholder="4XXXXXXXXX"
            value={value}
            onChange={(e) => onChange?.(e.target.value.replace(/\D/g, ''))}
            style={{ ...arialFontStyle, color: '#000000', backgroundColor: '#ffffff' }}
            className={cn(
              'w-full h-full px-1.5 py-0 rounded border bg-white text-black font-semibold focus:outline-none focus:ring-1 leading-none shadow-sm placeholder:text-slate-400',
              validationError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-400 focus:ring-indigo-600'
            )}
          />
        </div>
      );

    case 'date_signed':
      return (
        <div
          style={{ ...arialFontStyle, color: '#000000', backgroundColor: '#ffffff' }}
          className="w-full h-full px-1.5 py-0 rounded border border-slate-400 bg-white text-black font-semibold flex items-center justify-between shadow-sm"
        >
          <span className="truncate">{value || formatSaDate(new Date())}</span>
          <Calendar className="w-3 h-3 text-slate-700 shrink-0 ml-1" />
        </div>
      );

    case 'dropdown':
      const options = (field.options as string[]) || ['Option 1', 'Option 2', 'Option 3'];
      return (
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ ...arialFontStyle, color: '#000000', backgroundColor: '#ffffff' }}
          className="w-full h-full px-1 py-0 rounded border border-slate-400 bg-white text-black font-semibold focus:ring-1 focus:ring-indigo-600 outline-none leading-none shadow-sm"
        >
          <option value="">Select...</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
          placeholder={field.placeholder || field.label || ''}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={field.read_only}
          style={{ ...arialFontStyle, color: '#000000', backgroundColor: '#ffffff' }}
          className="w-full h-full px-1.5 py-0 rounded border border-slate-400 bg-white text-black font-semibold focus:ring-1 focus:ring-indigo-600 outline-none leading-none shadow-sm placeholder:text-slate-400"
        />
      );
  }
}
