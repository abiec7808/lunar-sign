import crypto from 'crypto';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  isCompromised?: boolean;
}

/**
 * Validates password complexity:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - Optionally checks against HaveIBeenPwned k-anonymity API
 */
export async function validatePasswordSecurity(
  password: string,
  checkPwned = true
): Promise<PasswordValidationResult> {
  const errors: string[] = [];

  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc.).');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  if (checkPwned && process.env.ENABLE_HAVEIBEENPWNED_CHECK !== 'false') {
    try {
      const isCompromised = await checkHaveIBeenPwned(password);
      if (isCompromised) {
        return {
          isValid: false,
          isCompromised: true,
          errors: ['This password has previously appeared in known data breaches. Please choose a different, unique password.'],
        };
      }
    } catch {
      // If network fails to reach HIBP API, do not block user if complexity passed
    }
  }

  return { isValid: true, errors: [] };
}

/**
 * Checks password against HIBP k-Anonymity API (safe: only sends 5-char SHA-1 prefix)
 */
export async function checkHaveIBeenPwned(password: string): Promise<boolean> {
  const sha1 = crypto
    .createHash('sha1')
    .update(password)
    .digest('hex')
    .toUpperCase();

  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
  });

  if (!response.ok) return false;

  const text = await response.text();
  const lines = text.split('\n');

  for (const line of lines) {
    const [lineSuffix] = line.trim().split(':');
    if (lineSuffix && lineSuffix.toUpperCase() === suffix) {
      return true; // Found in breach database
    }
  }

  return false;
}
