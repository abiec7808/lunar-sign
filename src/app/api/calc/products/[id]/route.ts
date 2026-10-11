import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { verifyCalcAccess, saveProduct, deleteProduct } from '@/lib/calc/service';

const ProductUpdateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cost_price: z.number().min(0, 'Cost price must be >= 0'),
  selling_price: z.number().min(0, 'Selling price must be >= 0'),
  billing_cycle: z.enum(['monthly', 'annually', 'once_off']).default('monthly'),
  is_active: z.boolean().default(true),
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
    const validated = ProductUpdateSchema.parse(body);

    const product = await saveProduct(access.effectiveOrgId, {
      ...validated,
      id,
    });
    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Error updating calc product:', err);
    return NextResponse.json({ error: err.message || 'Failed to update product' }, { status: 500 });
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

    await deleteProduct(access.effectiveOrgId, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting calc product:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete product' }, { status: 500 });
  }
}
