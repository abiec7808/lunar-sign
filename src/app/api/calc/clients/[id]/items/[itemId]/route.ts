import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { verifyCalcAccess, deleteClientItem } from '@/lib/calc/service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: clientId, itemId } = await params;
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyCalcAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json({ error: access.error || 'Access denied' }, { status: 403 });
    }

    await deleteClientItem(access.effectiveOrgId, clientId, itemId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting client item:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete item' }, { status: 500 });
  }
}
