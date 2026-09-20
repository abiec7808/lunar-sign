import crypto from 'crypto';
import { cookies } from 'next/headers';
import { dbQuery } from '@/lib/db';

const SESSION_COOKIE_NAME = 'lunar_session';
const SECRET_KEY = process.env.APP_SECRET || 'lunar_sign_secret_key_production_32bytes';

export interface UserSession {
  userId: string;
  orgId: string;
  email: string;
  fullName: string;
  role: string;
  isSuperAdmin: boolean;
  orgName: string;
  orgSlug: string;
  orgStatus: 'approved' | 'pending_approval' | 'suspended';
  maxUsers: number;
  maxDocuments: number;
  createdAt: number;
}

export function createSessionToken(data: UserSession): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payload)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const sessionData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as UserSession;

    // 14 days expiration check
    if (Date.now() - sessionData.createdAt > 14 * 24 * 3600 * 1000) {
      return null;
    }

    return sessionData;
  } catch {
    return null;
  }
}

export async function getCurrentSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: UserSession) {
  const token = createSessionToken(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 24 * 3600, // 14 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAuthenticatedUserWithOrg(): Promise<UserSession | null> {
  const session = await getCurrentSession();
  if (session) {
    // Optionally refresh org status & super admin flag from DB
    try {
      const res = await dbQuery(
        `SELECT p.id as user_id, p.full_name, p.email, p.role, p.is_super_admin,
                o.id as org_id, o.name as org_name, o.slug as org_slug, o.status as org_status,
                o.max_users, o.max_documents
         FROM profiles p
         JOIN organisations o ON p.org_id = o.id
         WHERE p.id = $1
         LIMIT 1`,
        [session.userId]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          userId: r.user_id,
          orgId: r.org_id,
          email: r.email,
          fullName: r.full_name,
          role: r.role,
          isSuperAdmin: Boolean(r.is_super_admin || r.email === 'admin@lunarposgeorge.co.za'),
          orgName: r.org_name,
          orgSlug: r.org_slug,
          orgStatus: r.org_status || 'approved',
          maxUsers: r.max_users || 5,
          maxDocuments: r.max_documents || 10,
          createdAt: session.createdAt,
        };
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    }
    return session;
  }

  // Fallback to default super admin for initial development
  try {
    const res = await dbQuery(
      `SELECT p.id as user_id, p.full_name, p.email, p.role, p.is_super_admin,
              o.id as org_id, o.name as org_name, o.slug as org_slug, o.status as org_status,
              o.max_users, o.max_documents
       FROM profiles p
       JOIN organisations o ON p.org_id = o.id
       WHERE p.email = 'admin@lunarposgeorge.co.za'
       LIMIT 1`
    );
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        userId: r.user_id,
        orgId: r.org_id,
        email: r.email,
        fullName: r.full_name,
        role: r.role,
        isSuperAdmin: true,
        orgName: r.org_name,
        orgSlug: r.org_slug,
        orgStatus: r.org_status || 'approved',
        maxUsers: r.max_users || 100,
        maxDocuments: r.max_documents || 1000,
        createdAt: Date.now(),
      };
    }
  } catch (err) {
    console.error('Error fetching fallback super admin:', err);
  }

  return null;
}
