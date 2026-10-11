import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { verifyCalcAccess, saveClientItem } from '@/lib/calc/service';

const ItemSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid('Valid product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  custom_cost_price: z.number().nullable().optional(),
  custom_selling_price: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const validated = ItemSchema.parse(body);

    const item = await saveClientItem(access.effectiveOrgId, clientId, validated);
    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    console.error('Error saving client item:', err);
    return NextResponse.json({ error: err.message || 'Failed to save item' }, { status: 500 });
  }
}
