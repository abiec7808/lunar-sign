import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import { verifyCalcAccess, getProducts, saveProduct } from '@/lib/calc/service';

const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Product name is required'),
  code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cost_price: z.number().min(0, 'Cost price must be >= 0'),
  selling_price: z.number().min(0, 'Selling price must be >= 0'),
  billing_cycle: z.enum(['monthly', 'annually', 'once_off']).default('monthly'),
  is_active: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    const products = await getProducts(access.effectiveOrgId);
    return NextResponse.json({ products });
  } catch (err: any) {
    console.error('Error fetching calc products:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch products' }, { status: 500 });
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
    const validated = ProductSchema.parse(body);

    const product = await saveProduct(access.effectiveOrgId, validated);
    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Error saving calc product:', err);
    return NextResponse.json({ error: err.message || 'Failed to save product' }, { status: 500 });
  }
}
