import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { verifyCalcAccess, getClientsWithCalculations, saveClient } from '@/lib/calc/service';

const ClientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Client name is required'),
  contact_person: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['active', 'pending', 'inactive']).default('active'),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    const { clients, summary } = await getClientsWithCalculations(access.effectiveOrgId);
    return NextResponse.json({ clients, summary });
  } catch (err: any) {
    console.error('Error fetching calc clients:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validated = ClientSchema.parse(body);

    const client = await saveClient(access.effectiveOrgId, validated);
    return NextResponse.json({ success: true, client });
  } catch (err: any) {
    console.error('Error saving calc client:', err);
    return NextResponse.json({ error: err.message || 'Failed to save client' }, { status: 500 });
  }
}
