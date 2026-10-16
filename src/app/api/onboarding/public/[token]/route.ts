import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicOnboarding, submitClientOnboarding } from '@/lib/onboarding/service';

const ClientSubmitSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Surname is required'),
  email: z.string().email('A valid email address is required'),
  contactNumber: z.string().min(5, 'Primary contact number is required'),
  mobileNumber: z.string().optional(),
  landlineNumber: z.string().optional(),
  companyName: z.string().min(1, 'Company name is required'),
  registrationNumber: z.string().optional(),
  answers: z.record(z.string(), z.any()).default({}),
  signatureDataUrl: z.string().optional(),
  declarationAgreed: z.boolean(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const data = await getPublicOnboarding(token);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in public onboarding GET:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load onboarding link' },
      { status: 404 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const body = await req.json();
    const validated = ClientSubmitSchema.parse(body);

    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const result = await submitClientOnboarding(
      token,
      {
        ...validated,
        baseUrl,
      },
      ip,
      userAgent
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in public onboarding POST:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit onboarding form' },
      { status: 400 }
    );
  }
}
