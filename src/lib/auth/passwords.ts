import crypto from 'crypto';
import { dbQuery } from '@/lib/db';

/**
 * Password hashing and verification using crypto scrypt with unique salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // 1. Check if stored hash is in scrypt format (salt:key)
  if (storedHash.includes(':')) {
    const [salt, key] = storedHash.split(':');
    return new Promise((resolve) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return resolve(false);
        resolve(crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey));
      });
    });
  }

  // 2. Check pgcrypto crypt format via database
  try {
    const res = await dbQuery(
      `SELECT (password_hash = crypt($1, password_hash)) AS is_match FROM profiles WHERE password_hash = $2 LIMIT 1`,
      [password, storedHash]
    );
    if (res.rows.length > 0 && res.rows[0].is_match) {
      return true;
    }
  } catch (err) {
    console.error('Error verifying pgcrypto password:', err);
  }

  return false;
}
