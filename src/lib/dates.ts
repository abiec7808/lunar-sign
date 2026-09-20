import { format, parseISO, isValid } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

export const SA_TIMEZONE = 'Africa/Johannesburg';

/**
 * Format a UTC date string or Date object into standard South African format
 * Example: '19 September 2026'
 */
export function formatSaDate(date: string | Date | null | undefined, formatPattern = 'dd MMMM yyyy'): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return formatInTimeZone(d, SA_TIMEZONE, formatPattern);
  } catch {
    return '—';
  }
}

/**
 * Format a UTC date string with SAST time
 * Example: '19 September 2026, 14:35:10 SAST'
 */
export function formatSaDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '—';
    return `${formatInTimeZone(d, SA_TIMEZONE, 'dd MMMM yyyy, HH:mm:ss')} SAST`;
  } catch {
    return '—';
  }
}

/**
 * Format ISO string for signature certificate audit logs
 */
export function formatAuditTimestamps(date: string | Date = new Date()): { utc: string; sast: string } {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return {
    utc: formatInTimeZone(d, 'UTC', 'yyyy-MM-dd HH:mm:ss') + ' UTC',
    sast: formatInTimeZone(d, SA_TIMEZONE, 'yyyy-MM-dd HH:mm:ss') + ' SAST',
  };
}

/**
 * Current UTC ISO string for storing in database
 */
export function nowUtcIso(): string {
  return new Date().toISOString();
}
