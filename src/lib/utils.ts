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

