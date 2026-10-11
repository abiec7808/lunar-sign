import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { verifyCalcAccess, saveClient, deleteClient } from '@/lib/calc/service';

const ClientUpdateSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  contact_person: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validated = ClientUpdateSchema.parse(body);

    const client = await saveClient(access.effectiveOrgId, {
      ...validated,
      id,
    });
    return NextResponse.json({ success: true, client });
  } catch (err: any) {
    console.error('Error updating calc client:', err);
    return NextResponse.json({ error: err.message || 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    await deleteClient(access.effectiveOrgId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting calc client:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete client' }, { status: 500 });
  }
}
