import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession } from '@/lib/auth/session';
import {
  verifyOnboardingAccess,
  getOnboardingTemplate,
  saveOnboardingTemplate,
} from '@/lib/onboarding/service';

const QuestionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Question label is required'),
  type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox', 'date', 'number']),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  helpText: z.string().optional(),
});

const TemplateUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  welcome_heading: z.string().nullable().optional(),
  welcome_subheading: z.string().nullable().optional(),
  declaration_text: z.string().nullable().optional(),
  require_signature: z.boolean().default(true),
  questions: z.array(QuestionSchema),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyOnboardingAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Access denied', requested: access.requested },
        { status: 403 }
      );
    }

    const template = await getOnboardingTemplate(access.effectiveOrgId);
    return NextResponse.json({ template });
  } catch (err: any) {
    console.error('Error fetching onboarding template:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const targetOrgId = req.nextUrl.searchParams.get('org_id');
    const access = await verifyOnboardingAccess(session, targetOrgId);

    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error || 'Access denied', requested: access.requested },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = TemplateUpdateSchema.parse(body);

    const updated = await saveOnboardingTemplate(access.effectiveOrgId, validated);
    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    console.error('Error saving onboarding template:', err);
    return NextResponse.json({ error: err.message || 'Failed to save template' }, { status: 500 });
  }
}
