import crypto from 'crypto';

/**
 * Generate a 32-byte cryptographically secure random token (URL-safe base64)
 */
export function generateSecureToken(): string {
  return crypto
    .randomBytes(32)
    .toString('base64url');
}

/**
 * Compute SHA-256 hash of a string or Buffer, returned as a hex string
 */
export function sha256Hex(data: string | Buffer): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Hash a signing token before storing in the database
 */
export function hashSigningToken(token: string): string {
  return sha256Hex(token);
}

/**
 * Hash an access code or OTP with a salt
 */
export function hashAccessCode(code: string, salt = 'lunar_access_salt'): string {
  return sha256Hex(`${salt}:${code.trim()}`);
}

/**
 * Generate HMAC-SHA256 signature for outgoing webhooks
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Generate a 6-digit numeric OTP code
 */
export function generateNumericOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a prefixed API Key: ls_live_<random_bytes>
 */
export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const random = crypto.randomBytes(24).toString('base64url');
  const rawKey = `ls_live_${random}`;
  const keyPrefix = rawKey.substring(0, 12);
  const keyHash = sha256Hex(rawKey);
  return { rawKey, keyPrefix, keyHash };
}
