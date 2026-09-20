import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { dbQuery } from '@/lib/db';

const ContactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().optional(),
  role: z.enum(['signer', 'approver', 'filler', 'viewer']).default('signer'),
});

// GET /api/contacts - List all contacts for the authenticated business
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await dbQuery(
      `SELECT id, org_id, name, email, phone, role, created_at, updated_at
       FROM contacts
       WHERE org_id = $1
       ORDER BY name ASC`,
      [session.orgId]
    );

    return NextResponse.json({ contacts: res.rows });
  } catch (err: any) {
    console.error('Error fetching contacts:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact for the authenticated business
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = ContactSchema.parse(body);

    const email = validated.email.trim().toLowerCase();

    // Check if contact already exists in this organisation
    const existing = await dbQuery(
      `SELECT id FROM contacts WHERE org_id = $1 AND LOWER(email) = $2 LIMIT 1`,
      [session.orgId, email]
    );

    if (existing.rows.length > 0) {
      // Update existing contact
      const updated = await dbQuery(
        `UPDATE contacts
         SET name = $1, phone = $2, role = $3, updated_at = NOW()
         WHERE id = $4 AND org_id = $5
         RETURNING *`,
        [validated.name.trim(), validated.phone || null, validated.role, existing.rows[0].id, session.orgId]
      );
      return NextResponse.json({ contact: updated.rows[0], updated: true });
    }

    // Insert new contact
    const inserted = await dbQuery(
      `INSERT INTO contacts (org_id, name, email, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [session.orgId, validated.name.trim(), email, validated.phone || null, validated.role]
    );

    return NextResponse.json({ contact: inserted.rows[0], created: true }, { status: 201 });
  } catch (err: any) {
    console.error('Error saving contact:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save contact' }, { status: 400 });
  }
}

// DELETE /api/contacts - Delete a contact
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    await dbQuery(
      `DELETE FROM contacts WHERE id = $1 AND org_id = $2`,
      [id, session.orgId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting contact:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete contact' }, { status: 500 });
  }
}
