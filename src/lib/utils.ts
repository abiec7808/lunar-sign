import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatZarCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount;
  if (isNaN(num)) return 'R 0,00';
  
  // Format with space as thousands separator and comma as decimal separator (SA standard)
  const parts = num.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `R ${intPart},${parts[1]}`;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function truncateString(str: string, maxLength = 30): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export interface RecipientTheme {
  primary: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
  text: string;
  name: string;
}

export const RECIPIENT_THEMES: RecipientTheme[] = [
  { primary: '#4f46e5', bg: '#eef2ff', badgeBg: '#4f46e5', badgeText: '#ffffff', text: '#1e1b4b', name: 'Indigo' },
  { primary: '#d97706', bg: '#fffbeb', badgeBg: '#d97706', badgeText: '#ffffff', text: '#451a03', name: 'Amber' },
  { primary: '#059669', bg: '#ecfdf5', badgeBg: '#059669', badgeText: '#ffffff', text: '#064e3b', name: 'Emerald' },
  { primary: '#e11d48', bg: '#fff1f2', badgeBg: '#e11d48', badgeText: '#ffffff', text: '#4c0519', name: 'Rose' },
  { primary: '#7c3aed', bg: '#f5f3ff', badgeBg: '#7c3aed', badgeText: '#ffffff', text: '#2e1065', name: 'Purple' },
  { primary: '#0891b2', bg: '#ecfeff', badgeBg: '#0891b2', badgeText: '#ffffff', text: '#164e63', name: 'Cyan' },
  { primary: '#ea580c', bg: '#fff7ed', badgeBg: '#ea580c', badgeText: '#ffffff', text: '#431407', name: 'Orange' },
  { primary: '#0d9488', bg: '#f0fdfa', badgeBg: '#0d9488', badgeText: '#ffffff', text: '#134e4a', name: 'Teal' },
];

export const SENDER_THEME: RecipientTheme = {
  primary: '#475569',
  bg: '#f1f5f9',
  badgeBg: '#475569',
  badgeText: '#ffffff',
  text: '#0f172a',
  name: 'Sender',
};

export const RECIPIENT_COLORS = RECIPIENT_THEMES.map((t) => t.primary);

export function getRecipientTheme(indexOrColor?: number | string | null): RecipientTheme {
  if (indexOrColor === undefined || indexOrColor === null) {
    return SENDER_THEME;
  }
  if (typeof indexOrColor === 'number') {
    return RECIPIENT_THEMES[Math.abs(indexOrColor) % RECIPIENT_THEMES.length];
  }
  const match = RECIPIENT_THEMES.find(
    (t) => t.primary.toLowerCase() === indexOrColor.toLowerCase()
  );
  if (match) return match;

  return {
    primary: indexOrColor || '#4f46e5',
    bg: '#eef2ff',
    badgeBg: indexOrColor || '#4f46e5',
    badgeText: '#ffffff',
    text: '#0f172a',
    name: 'Custom',
  };
}

export function getRecipientColor(index: number): string {
  return RECIPIENT_THEMES[index % RECIPIENT_THEMES.length].primary;
}

export function parseFieldOptions(rawOptions: any): string[] {
  if (!rawOptions) return [];
  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((o) => (typeof o === 'string' ? o.trim() : String(o || '').trim()))
      .filter((o) => o.length > 0);
  }
  if (typeof rawOptions === 'string') {
    let str = rawOptions.trim();
    if (!str) return [];
    // Unwrap nested stringified JSON if present
    for (let depth = 0; depth < 3; depth++) {
      if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
        try {
          const unquoted = JSON.parse(str);
          if (typeof unquoted === 'string') str = unquoted.trim();
          else if (Array.isArray(unquoted)) return parseFieldOptions(unquoted);
          else break;
        } catch (e) {
          str = str.slice(1, -1).trim();
        }
      } else {
        break;
      }
    }
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed
          .map((o) => (typeof o === 'string' ? o.trim() : String(o || '').trim()))
          .filter((o) => o.length > 0);
      }
    } catch (e) {}

    // Fallback: parse delimiter-separated list (newline or comma)
    return str
      .split(/\r?\n|,/)
      .map((s) => s.replace(/^[\[\]"']+|[\[\]"']+$/g, '').trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export const BANK_ACCOUNT_TYPE_OPTIONS = [
  'Current Account',
  'Cheque Account',
  'Savings Account',
  'Transmission Account',
];

export const DEBIT_ORDER_DATE_OPTIONS = [
  '1st',
  '7th',
  '15th',
  '25th',
];

export function getSmartFieldOptions(fieldOrOptions: any, labelHint?: string): string[] {
  let raw = fieldOrOptions;
  let label = labelHint || '';
  if (fieldOrOptions && typeof fieldOrOptions === 'object' && !Array.isArray(fieldOrOptions)) {
    raw = fieldOrOptions.options;
    label = fieldOrOptions.label || labelHint || '';
  }

  const parsed = parseFieldOptions(raw);
  const isGeneric = parsed.length > 0 && parsed.every((opt, i) => opt.toLowerCase() === `option ${i + 1}`);

  if (parsed.length > 0 && !isGeneric) {
    return parsed;
  }

  const l = label.toLowerCase();
  if (l.includes('account') || l.includes('bank') || l.includes('type of acc')) {
    return BANK_ACCOUNT_TYPE_OPTIONS;
  }
  if (l.includes('date') || l.includes('day') || l.includes('debit') || l.includes('payment') || l.includes('deduct')) {
    return DEBIT_ORDER_DATE_OPTIONS;
  }
  if (l.includes('province')) {
    return ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'];
  }
  if (l.includes('title') || l.includes('salutation')) {
    return ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'];
  }
  if (l.includes('yes') || l.includes('agree') || l.includes('consent')) {
    return ['Yes', 'No'];
  }

  return parsed.length > 0 ? parsed : BANK_ACCOUNT_TYPE_OPTIONS;
}
