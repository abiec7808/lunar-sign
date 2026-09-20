import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { dbQuery } from '@/lib/db';
import { hashPassword } from '@/lib/auth/passwords';
import { setSessionCookie, UserSession } from '@/lib/auth/session';
import { emailService } from '@/lib/email/service';

const RegisterSchema = z.object({
  businessName: z.string().min(2, 'Business Name is required'),
  adminFullName: z.string().min(2, 'Admin Full Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  companyRegNumber: z.string().optional(),
  address: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.parse(body);

    const email = validated.email.trim().toLowerCase();

    // 1. Check if user email already exists
    const existingUser = await dbQuery('SELECT id FROM profiles WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email address already exists.' }, { status: 400 });
    }

    // 2. Generate slug for organisation
    let slug = validated.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!slug) slug = 'business';

    // Verify slug uniqueness
    const slugCheck = await dbQuery('SELECT id FROM organisations WHERE slug = $1 LIMIT 1', [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // 3. Insert Organisation with pending_approval status and limits (5 users, 10 docs)
    const orgRes = await dbQuery(
      `INSERT INTO organisations (
        name, slug, email_footer_text, reply_to_email, vat_number, company_reg_number,
        phone, address, status, max_users, max_documents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_approval', 5, 10)
      RETURNING id, name, slug, status, max_users, max_documents`,
      [
        validated.businessName,
        slug,
        `${validated.businessName} - E-Signed via Lunar Sign. SA ECTA 25 of 2002 Compliant.`,
        email,
        validated.vatNumber || null,
        validated.companyRegNumber || null,
        validated.phone || null,
        validated.address || null,
      ]
    );

    const org = orgRes.rows[0];

    // 4. Hash password and insert Admin Profile
    const passwordHash = await hashPassword(validated.password);

    const profileRes = await dbQuery(
      `INSERT INTO profiles (org_id, full_name, email, role, phone, is_active, is_super_admin, password_hash)
       VALUES ($1, $2, $3, 'owner', $4, true, false, $5)
       RETURNING id, full_name, email, role`,
      [org.id, validated.adminFullName, email, validated.phone || null, passwordHash]
    );

    const profile = profileRes.rows[0];

    // 5. Create Session & Set Cookie
    const session: UserSession = {
      userId: profile.id,
      orgId: org.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      isSuperAdmin: false,
      orgName: org.name,
      orgSlug: org.slug,
      orgStatus: org.status || 'pending_approval',
      maxUsers: org.max_users || 5,
      maxDocuments: org.max_documents || 10,
      createdAt: Date.now(),
    };

    await setSessionCookie(session);

    // 6. Log Audit Event
    try {
      await dbQuery(
        `INSERT INTO audit_events (actor_type, event_type, description, metadata)
         VALUES ('admin', 'org.registered', $1, $2)`,
        [
          `New business "${org.name}" registered by ${profile.full_name} (${profile.email}).`,
          JSON.stringify({
            orgId: org.id,
            adminId: profile.id,
            vatNumber: validated.vatNumber,
            registeredAt: new Date().toISOString(),
          }),
        ]
      );
    } catch (auditErr) {
      console.warn('Audit event log warning:', auditErr);
    }

    // 7. Inform Super Admin admin@lunarposgeorge.co.za about the new business registration
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sign.lunaposgeorge.co.za';
      await emailService.sendNewRegistrationAlert({
        to: 'admin@lunarposgeorge.co.za',
        businessName: validated.businessName,
        adminFullName: validated.adminFullName,
        adminEmail: email,
        phone: validated.phone || null,
        vatNumber: validated.vatNumber || null,
        companyRegNumber: validated.companyRegNumber || null,
        address: validated.address || null,
        approvalUrl: `${appUrl}/businesses`,
      });
      console.log(`[Registration] Alert email successfully dispatched to admin@lunarposgeorge.co.za for ${validated.businessName}`);
    } catch (emailErr) {
      console.error('[Registration] Failed to send super admin alert email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      user: session,
      message: 'Business account successfully created!',
    });
  } catch (err: any) {
    console.error('Error during business registration:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to register business account.' },
      { status: 500 }
    );
  }
}
