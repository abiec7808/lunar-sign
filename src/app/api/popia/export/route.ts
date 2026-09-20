import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { PopiaSubjectDataExport } from '@/lib/compliance/popia';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required for POPIA export.' }, { status: 400 });
  }

  const supabase = getAdminSupabaseClient();

  // Fetch recipients records by email
  const { data: recipientRecords } = await supabase
    .from('recipients')
    .select('*, documents(*)')
    .eq('email', email);

  const documentIds = recipientRecords?.map((r) => r.document_id) || [];

  // Fetch audit events related to this email or documents
  const { data: auditEvents } = await supabase
    .from('audit_events')
    .select('*')
    .in('document_id', documentIds);

  const exportPayload: PopiaSubjectDataExport = {
    exportedAt: new Date().toISOString(),
    recipientEmail: email,
    recordsCount: recipientRecords?.length || 0,
    documents: (recipientRecords || []).map((r) => ({
      documentId: r.document_id,
      title: r.documents?.title || 'Unknown',
      role: r.role,
      status: r.status,
      openedAt: r.opened_at,
      signedAt: r.signed_at,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
    })),
    signatures: [],
    auditEvents: (auditEvents || []).map((e) => ({
      eventId: e.id,
      eventType: e.event_type,
      description: e.description,
      timestamp: e.created_at,
    })),
  };

  return NextResponse.json(exportPayload);
}
