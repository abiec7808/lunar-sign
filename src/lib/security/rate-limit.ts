/**
 * In-Memory Sliding Window Rate Limiter
 * Limits login attempts to 5 per 15 minutes per key (IP address or account email)
 */

interface RateLimitRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  lockoutRemainingSeconds?: number;
}

export function checkRateLimit(key: string): RateLimitStatus {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if locked out
  if (record.lockedUntil && record.lockedUntil > now) {
    const lockoutRemainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingSeconds,
    };
  }

  // If window has passed, reset record
  if (now - record.firstAttempt > WINDOW_MS) {
    rateLimitStore.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // If reached max attempts within window
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    rateLimitStore.set(key, record);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingSeconds: Math.ceil(LOCKOUT_MS / 1000),
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - record.count,
  };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
  } else {
    record.count += 1;
    record.lastAttempt = now;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
    rateLimitStore.set(key, record);
  }
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
