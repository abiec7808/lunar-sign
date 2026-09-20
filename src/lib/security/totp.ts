import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TotpEnrollmentData {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

/**
 * Generate a new TOTP secret and QR code data URL for enrolling an admin
 */
export async function generateTotpSecret(
  email: string,
  issuer = 'Lunar Sign (LunarPOS George)'
): Promise<TotpEnrollmentData> {
  const secretObj = speakeasy.generateSecret({
    name: `${issuer}:${email}`,
    issuer,
    length: 20,
  });

  const otpauthUrl = secretObj.otpauth_url || '';
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    margin: 2,
    width: 250,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return {
    secret: secretObj.base32,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Verify a 6-digit TOTP token against a user's base32 secret
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: token.trim(),
    window: 1, // Allow 1 step (30s) before/after for clock drift
  });
}
