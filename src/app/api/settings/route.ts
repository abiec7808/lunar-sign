import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, setSessionCookie } from '@/lib/auth/session';
import { dbQuery } from '@/lib/db';

/**
 * GET /api/settings - Fetch current organization settings, branding, and policies
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await dbQuery(
      `SELECT id, name, slug, logo_url, favicon_url, primary_color, accent_color,
              text_color, background_color, email_footer_text, reply_to_email,
              custom_domain, retention_days, purge_voided_drafts_days,
              vat_number, company_reg_number, phone, address, status, max_users, max_documents,
              created_at, updated_at
       FROM organisations
       WHERE id = $1
       LIMIT 1`,
      [session.orgId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
    }

    return NextResponse.json({ settings: res.rows[0] });
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PUT /api/settings - Update organization branding, unique name, colors, and settings
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      logoUrl,
      primaryColor,
      accentColor,
      emailFooterText,
      replyToEmail,
      customDomain,
      phone,
      address,
      vatNumber,
      companyRegNumber,
      retentionDays,
      purgeVoidedDraftsDays,
    } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Organisation name is required (minimum 2 characters).' }, { status: 400 });
    }

    const cleanName = name.trim();

    // 1. Ensure organisation name is unique across all other businesses
    const checkUnique = await dbQuery(
      `SELECT id, name FROM organisations WHERE LOWER(name) = LOWER($1) AND id != $2 LIMIT 1`,
      [cleanName, session.orgId]
    );

    if (checkUnique.rows.length > 0) {
      return NextResponse.json(
        { error: `The business name "${cleanName}" is already in use. Please choose a unique name.` },
        { status: 400 }
      );
    }

    // 2. Generate slug
    const cleanSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'org';

    // 3. Update organization in PostgreSQL
    const updateRes = await dbQuery(
      `UPDATE organisations
       SET name = $1,
           slug = $2,
           logo_url = COALESCE($3, logo_url),
           primary_color = COALESCE($4, primary_color),
           accent_color = COALESCE($5, accent_color),
           email_footer_text = $6,
           reply_to_email = $7,
           custom_domain = $8,
           phone = $9,
           address = $10,
           vat_number = $11,
           company_reg_number = $12,
           retention_days = COALESCE($13, retention_days),
           purge_voided_drafts_days = COALESCE($14, purge_voided_drafts_days),
           updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        cleanName,
        cleanSlug,
        logoUrl !== undefined ? logoUrl : null,
        primaryColor || '#4f46e5',
        accentColor || '#06b6d4',
        emailFooterText || null,
        replyToEmail || null,
        customDomain || null,
        phone || null,
        address || null,
        vatNumber || null,
        companyRegNumber || null,
        retentionDays ? parseInt(retentionDays, 10) : 365,
        purgeVoidedDraftsDays ? parseInt(purgeVoidedDraftsDays, 10) : 30,
        session.orgId,
      ]
    );

    if (updateRes.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update organisation' }, { status: 404 });
    }

    const updatedOrg = updateRes.rows[0];

    // 4. Update current session cookie with new organization name and slug
    const updatedSession = {
      ...session,
      orgName: updatedOrg.name,
      orgSlug: updatedOrg.slug,
    };
    await setSessionCookie(updatedSession);

    // 5. Log audit event
    await dbQuery(
      `INSERT INTO audit_events (actor_type, event_type, description, metadata)
       VALUES ('admin', 'org.settings_updated', $1, $2)`,
      [
        `Organisation settings and branding updated for "${updatedOrg.name}".`,
        JSON.stringify({
          orgId: updatedOrg.id,
          name: updatedOrg.name,
          primaryColor: updatedOrg.primary_color,
          accentColor: updatedOrg.accent_color,
          updatedBy: session.email,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      settings: updatedOrg,
      message: `Settings and branding for "${updatedOrg.name}" saved successfully!`,
    });
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update settings' }, { status: 500 });
  }
}

/**
 * POST /api/settings - Alias for PUT
 */
export async function POST(req: NextRequest) {
  return PUT(req);
}
