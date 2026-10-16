import crypto from 'crypto';
import { dbQuery } from '@/lib/db';
import { UserSession } from '@/lib/auth/session';
import { emailService } from '@/lib/email/service';
import { formatSaDate } from '@/lib/dates';

export interface OnboardingQuestion {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface OnboardingTemplate {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  welcome_heading: string | null;
  welcome_subheading: string | null;
  declaration_text: string | null;
  require_signature: boolean;
  questions: OnboardingQuestion[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingSubmission {
  id: string;
  org_id: string;
  template_id: string | null;
  token: string;
  status: 'pending' | 'viewed' | 'submitted';
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  contact_number: string | null;
  mobile_number: string | null;
  landline_number: string | null;
  company_name: string | null;
  registration_number: string | null;
  answers: Record<string, any>;
  signature_data_url: string | null;
  signer_declaration_agreed: boolean;
  signer_ip: string | null;
  signer_user_agent: string | null;
  viewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed / Joined fields
  org_name?: string;
  org_logo?: string | null;
  org_primary_color?: string | null;
  org_reply_to_email?: string | null;
  org_phone?: string | null;
}

const DEFAULT_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 'q1',
    label: 'Primary Line of Business / Industry',
    type: 'select',
    required: true,
    placeholder: 'Select your industry...',
    options: [
      'Retail & Convenience Store',
      'Restaurant & Hospitality',
      'Boutique & Specialty Store',
      'Wholesale & Distribution',
      'Automotive & Workshops',
      'Professional Services & Healthcare',
      'Other',
    ],
    helpText: 'Helps us tailor your setup and account configuration',
  },
  {
    id: 'q2',
    label: 'Physical Operating Address / Business Premises',
    type: 'textarea',
    required: true,
    placeholder: 'Shop/Building name, Street Address, Suburb, City, Postal Code',
    helpText: 'Physical address for on-site services or deliveries',
  },
  {
    id: 'q3',
    label: 'Estimated POS Till Points / Active Terminals',
    type: 'select',
    required: true,
    placeholder: 'Select number of terminals...',
    options: ['1 Station', '2 Stations', '3 - 5 Stations', '6+ Stations'],
    helpText: 'Number of active lanes or devices required',
  },
  {
    id: 'q4',
    label: 'Accounts / Invoicing Email',
    type: 'text',
    required: false,
    placeholder: 'accounts@yourdomain.co.za',
    helpText: 'Where monthly statements and tax invoices should be sent (if different)',
  },
  {
    id: 'q5',
    label: 'VAT Registration Number',
    type: 'text',
    required: false,
    placeholder: 'e.g. 4010203040 (if VAT registered)',
    helpText: 'Leave empty if not VAT registered',
  },
  {
    id: 'q6',
    label: 'Special System Requirements / Notes',
    type: 'textarea',
    required: false,
    placeholder: 'Any special hardware, printer, network, or timeline requirements...',
    helpText: 'Optional notes for deployment and engineering teams',
  },
];

// Short 30s cache for org permission check to avoid repeating SELECT on every parallel request
const orgOnboardingCache = new Map<
  string,
  { enabled: boolean; requested: boolean; expires: number }
>();

export function invalidateOnboardingOrgCache(orgId?: string) {
  if (orgId) {
    orgOnboardingCache.delete(orgId);
  } else {
    orgOnboardingCache.clear();
  }
}

/**
 * Verifies if user has permission to access Client Onboarding for targetOrgId.
 */
export async function verifyOnboardingAccess(
  session: UserSession | null,
  targetOrgId?: string | null
): Promise<{
  allowed: boolean;
  effectiveOrgId: string;
  requested?: boolean;
  error?: string;
}> {
  if (!session) {
    return { allowed: false, effectiveOrgId: '', error: 'Authentication required' };
  }

  const isSuper = Boolean(
    session.isSuperAdmin || session.email === 'admin@lunarposgeorge.co.za'
  );

  if (isSuper) {
    const effective = targetOrgId && targetOrgId.trim() ? targetOrgId.trim() : session.orgId;
    return { allowed: true, effectiveOrgId: effective };
  }

  // Check 30s cache first
  const now = Date.now();
  const cached = orgOnboardingCache.get(session.orgId);
  let isEnabled = false;
  let isRequested = false;

  if (cached && cached.expires > now) {
    isEnabled = cached.enabled;
    isRequested = cached.requested;
  } else {
    const res = await dbQuery(
      `SELECT client_onboarding_enabled, client_onboarding_requested FROM organisations WHERE id = $1 LIMIT 1`,
      [session.orgId]
    );

    if (res.rows.length === 0) {
      return { allowed: false, effectiveOrgId: session.orgId, error: 'Organisation not found' };
    }

    const org = res.rows[0];
    isEnabled = Boolean(org.client_onboarding_enabled);
    isRequested = Boolean(org.client_onboarding_requested);
    orgOnboardingCache.set(session.orgId, {
      enabled: isEnabled,
      requested: isRequested,
      expires: now + 30000,
    });
  }

  if (!isEnabled) {
    return {
      allowed: false,
      effectiveOrgId: session.orgId,
      requested: isRequested,
      error: 'Client Onboarding module is not enabled for your business account.',
    };
  }

  return { allowed: true, effectiveOrgId: session.orgId };
}

/**
 * Business user requests activation of the Client Onboarding module.
 */
export async function requestOnboardingModule(
  orgId: string,
  requester: {
    fullName: string;
    email: string;
    phone?: string | null;
    orgName: string;
  }
): Promise<{ success: boolean; alreadyRequested?: boolean }> {
  const check = await dbQuery(
    `SELECT client_onboarding_enabled, client_onboarding_requested FROM organisations WHERE id = $1 LIMIT 1`,
    [orgId]
  );

  if (check.rows.length === 0) {
    throw new Error('Organisation not found');
  }

  const row = check.rows[0];
  if (row.client_onboarding_enabled) {
    return { success: true };
  }

  // Update organisation
  await dbQuery(
    `UPDATE organisations 
     SET client_onboarding_requested = true, client_onboarding_requested_at = NOW() 
     WHERE id = $1`,
    [orgId]
  );

  // Send email to Super Admin
  try {
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://lunar-sign.netlify.app'}/businesses`;
    await emailService.sendClientOnboardingRequestAlert({
      businessName: requester.orgName,
      adminFullName: requester.fullName,
      adminEmail: requester.email,
      phone: requester.phone,
      approvalUrl,
    });
  } catch (emailErr) {
    console.warn('Warning sending onboarding module request email:', emailErr);
  }

  return { success: true, alreadyRequested: Boolean(row.client_onboarding_requested) };
}

/**
 * Gets or creates the questionnaire template for an organisation.
 */
export async function getOnboardingTemplate(orgId: string): Promise<OnboardingTemplate> {
  const res = await dbQuery(
    `SELECT * FROM onboarding_templates WHERE org_id = $1 LIMIT 1`,
    [orgId]
  );

  if (res.rows.length > 0) {
    const row = res.rows[0];
    return {
      ...row,
      questions: Array.isArray(row.questions) ? row.questions : JSON.parse(row.questions || '[]'),
    };
  }

  // Create default template for business
  const insertRes = await dbQuery(
    `INSERT INTO onboarding_templates (
      org_id, title, description, welcome_heading, welcome_subheading, declaration_text, require_signature, questions
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    ) RETURNING *`,
    [
      orgId,
      'Client Onboarding & Setup Form',
      'Please fill out your official business and contact details to initiate your account setup.',
      'Welcome to Client Onboarding',
      'Please complete this onboarding form so our team can configure your account.',
      'I hereby certify that all information submitted herein is true, correct, and complete. I confirm that I am legally authorized to enter into service agreements and represent the business named above under South African ECTA Act 25 of 2002.',
      true,
      JSON.stringify(DEFAULT_QUESTIONS),
    ]
  );

  const newRow = insertRes.rows[0];
  return {
    ...newRow,
    questions: Array.isArray(newRow.questions) ? newRow.questions : JSON.parse(newRow.questions || '[]'),
  };
}

/**
 * Saves/updates the questionnaire template configuration for a business.
 */
export async function saveOnboardingTemplate(
  orgId: string,
  data: {
    title: string;
    description?: string | null;
    welcome_heading?: string | null;
    welcome_subheading?: string | null;
    declaration_text?: string | null;
    require_signature?: boolean;
    questions: OnboardingQuestion[];
  }
): Promise<OnboardingTemplate> {
  // Ensure template exists
  await getOnboardingTemplate(orgId);

  const res = await dbQuery(
    `UPDATE onboarding_templates
     SET title = $1,
         description = $2,
         welcome_heading = $3,
         welcome_subheading = $4,
         declaration_text = $5,
         require_signature = $6,
         questions = $7,
         updated_at = NOW()
     WHERE org_id = $8
     RETURNING *`,
    [
      data.title,
      data.description ?? null,
      data.welcome_heading ?? null,
      data.welcome_subheading ?? null,
      data.declaration_text ?? null,
      data.require_signature !== false,
      JSON.stringify(data.questions || []),
      orgId,
    ]
  );

  const row = res.rows[0];
  return {
    ...row,
    questions: Array.isArray(row.questions) ? row.questions : JSON.parse(row.questions || '[]'),
  };
}

/**
 * Lists all onboarding submissions / invite links for an organisation.
 */
export async function getOnboardingSubmissions(orgId: string): Promise<OnboardingSubmission[]> {
  const res = await dbQuery(
    `SELECT s.*, o.name as org_name, o.logo_url as org_logo, o.primary_color as org_primary_color
     FROM onboarding_submissions s
     JOIN organisations o ON s.org_id = o.id
     WHERE s.org_id = $1
     ORDER BY s.created_at DESC`,
    [orgId]
  );

  return res.rows.map((row) => ({
    ...row,
    answers: typeof row.answers === 'object' && row.answers !== null ? row.answers : {},
  }));
}

/**
 * Creates a new unique onboarding invite link.
 */
export async function createOnboardingInvite(
  orgId: string,
  params: {
    firstName?: string;
    lastName?: string;
    email?: string;
    contactNumber?: string;
    companyName?: string;
    customMessage?: string;
    sendEmail?: boolean;
    baseUrl?: string;
  }
): Promise<{ submission: OnboardingSubmission; inviteUrl: string; emailSent?: boolean }> {
  // Ensure template exists
  const template = await getOnboardingTemplate(orgId);

  // Generate secure URL-safe token
  const token = crypto.randomBytes(20).toString('hex');

  const fullName = [params.firstName, params.lastName].filter(Boolean).join(' ') || null;

  const res = await dbQuery(
    `INSERT INTO onboarding_submissions (
      org_id, template_id, token, status, first_name, last_name, full_name, email,
      contact_number, company_name
    ) VALUES (
      $1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9
    ) RETURNING *`,
    [
      orgId,
      template.id,
      token,
      params.firstName || null,
      params.lastName || null,
      fullName,
      params.email ? params.email.trim().toLowerCase() : null,
      params.contactNumber || null,
      params.companyName || null,
    ]
  );

  const submission = res.rows[0];
  const domain =
    params.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://lunar-sign.netlify.app';
  const inviteUrl = `${domain}/onboard/${token}`;

  // Await email dispatch so serverless lambda execution does not freeze before delivery
  let emailSent = false;
  if (params.sendEmail && params.email) {
    try {
      const orgRes = await dbQuery(
        `SELECT name, reply_to_email FROM organisations WHERE id = $1 LIMIT 1`,
        [orgId]
      );
      const orgName = orgRes.rows[0]?.name || 'Lunar Sign Partner';
      const replyToEmail = orgRes.rows[0]?.reply_to_email || undefined;
      emailSent = await emailService.sendClientOnboardingInvite({
        to: params.email.trim().toLowerCase(),
        businessName: orgName,
        clientName: fullName || params.companyName || 'Valued Client',
        onboardingUrl: inviteUrl,
        customMessage: params.customMessage,
        replyToEmail,
        force: true,
      });
      console.log(`[Onboarding] Invite email sent to ${params.email}:`, emailSent);
    } catch (emailErr) {
      console.error('Warning sending client onboarding invite email:', emailErr);
    }
  }

  return { submission, inviteUrl, emailSent };
}

/**
 * Resend an onboarding invitation email to the client for an existing submission.
 */
export async function resendOnboardingInvite(
  submissionId: string,
  session: UserSession | null,
  overrideEmail?: string,
  customMessage?: string,
  baseUrl?: string
): Promise<{ success: boolean; recipientEmail: string; message: string }> {
  if (!session) {
    throw new Error('Authentication required');
  }

  // 1. Fetch submission with organisation details
  const subRes = await dbQuery(
    `SELECT s.*, o.name as org_name, o.reply_to_email as org_reply_to_email
     FROM onboarding_submissions s
     JOIN organisations o ON s.org_id = o.id
     WHERE s.id::text = $1
     LIMIT 1`,
    [submissionId]
  );

  if (subRes.rows.length === 0) {
    throw new Error('Onboarding submission record not found.');
  }

  const sub = subRes.rows[0];
  const isSuper = Boolean(
    session.isSuperAdmin || session.email === 'admin@lunarposgeorge.co.za'
  );

  if (!isSuper && sub.org_id !== session.orgId) {
    throw new Error('Unauthorized. You can only resend invitations for your own business.');
  }

  const recipient = (overrideEmail || sub.email || '').trim().toLowerCase();
  if (!recipient || !recipient.includes('@')) {
    throw new Error('A valid recipient email address is required.');
  }

  // If email was updated, update the submission record
  if (overrideEmail && overrideEmail.trim().toLowerCase() !== sub.email) {
    await dbQuery(
      `UPDATE onboarding_submissions SET email = $1, updated_at = NOW() WHERE id::text = $2`,
      [recipient, submissionId]
    );
  }

  const domain =
    baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://lunar-sign.netlify.app';
  const inviteUrl = `${domain}/onboard/${sub.token}`;

  const displayName = sub.full_name || sub.company_name || 'Valued Client';
  const orgName = sub.org_name || 'Lunar Sign Partner';

  const ok = await emailService.sendClientOnboardingInvite({
    to: recipient,
    businessName: orgName,
    clientName: displayName,
    onboardingUrl: inviteUrl,
    customMessage: customMessage || undefined,
    replyToEmail: sub.org_reply_to_email || undefined,
    force: true,
  });

  if (!ok) {
    throw new Error('Failed to dispatch invitation email. Please verify the recipient email address.');
  }

  return {
    success: true,
    recipientEmail: recipient,
    message: `Onboarding invitation successfully resent to ${recipient}`,
  };
}

/**
 * Public lookup for client onboarding form by unique token.
 */
export async function getPublicOnboarding(token: string): Promise<{
  submission: OnboardingSubmission;
  template: OnboardingTemplate;
  organisation: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_color: string | null;
    reply_to_email: string | null;
    phone: string | null;
  };
}> {
  const res = await dbQuery(
    `SELECT s.*, 
            o.name as org_name, 
            o.logo_url as org_logo, 
            o.primary_color as org_primary_color,
            o.reply_to_email as org_reply_to_email,
            o.phone as org_phone,
            o.id as org_id
     FROM onboarding_submissions s
     JOIN organisations o ON s.org_id = o.id
     WHERE s.token = $1
     LIMIT 1`,
    [token]
  );

  if (res.rows.length === 0) {
    throw new Error('Onboarding link is invalid or has expired.');
  }

  const raw = res.rows[0];

  // If pending, mark as viewed
  if (raw.status === 'pending') {
    await dbQuery(
      `UPDATE onboarding_submissions 
       SET status = 'viewed', viewed_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [raw.id]
    );
    raw.status = 'viewed';
  }

  // Fetch or build template
  let template: OnboardingTemplate;
  if (raw.template_id) {
    const tRes = await dbQuery(
      `SELECT * FROM onboarding_templates WHERE id = $1 LIMIT 1`,
      [raw.template_id]
    );
    if (tRes.rows.length > 0) {
      const tRow = tRes.rows[0];
      template = {
        ...tRow,
        questions: Array.isArray(tRow.questions) ? tRow.questions : JSON.parse(tRow.questions || '[]'),
      };
    } else {
      template = await getOnboardingTemplate(raw.org_id);
    }
  } else {
    template = await getOnboardingTemplate(raw.org_id);
  }

  const submission: OnboardingSubmission = {
    ...raw,
    answers: typeof raw.answers === 'object' && raw.answers !== null ? raw.answers : {},
  };

  const organisation = {
    id: raw.org_id,
    name: raw.org_name,
    logo_url: raw.org_logo,
    primary_color: raw.org_primary_color,
    reply_to_email: raw.org_reply_to_email,
    phone: raw.org_phone,
  };

  return { submission, template, organisation };
}

/**
 * Handles client submission of the onboarding form:
 * 1. Validates inputs & signature
 * 2. Persists submission details and answers
 * 3. SYNCHRONIZES INTO CLIENT LISTS (calc_clients AND contacts)!
 * 4. Dispatches notification emails to business and client receipt
 */
export async function submitClientOnboarding(
  token: string,
  payload: {
    firstName: string;
    lastName: string;
    email: string;
    contactNumber: string;
    mobileNumber?: string;
    landlineNumber?: string;
    companyName: string;
    registrationNumber?: string;
    answers: Record<string, any>;
    signatureDataUrl?: string;
    declarationAgreed: boolean;
    baseUrl?: string;
  },
  ip?: string,
  userAgent?: string
): Promise<{ success: boolean; submissionId: string; clientId: string }> {
  // 1. Fetch current submission
  const subRes = await dbQuery(
    `SELECT s.*, o.name as org_name, o.reply_to_email as org_reply_to_email
     FROM onboarding_submissions s
     JOIN organisations o ON s.org_id = o.id
     WHERE s.token = $1
     LIMIT 1`,
    [token]
  );

  if (subRes.rows.length === 0) {
    throw new Error('Onboarding link is invalid or expired.');
  }

  const current = subRes.rows[0];
  const orgId = current.org_id;
  const orgName = current.org_name;
  const orgReplyTo = current.org_reply_to_email || 'admin@lunarposgeorge.co.za';

  // Validation
  const firstName = payload.firstName.trim();
  const lastName = payload.lastName.trim();
  const fullName = `${firstName} ${lastName}`;
  const email = payload.email.trim().toLowerCase();
  const contactNumber = payload.contactNumber.trim();
  const mobileNumber = payload.mobileNumber?.trim() || null;
  const landlineNumber = payload.landlineNumber?.trim() || null;
  const companyName = payload.companyName.trim();
  const regNumber = payload.registrationNumber?.trim() || null;

  if (!firstName || !lastName) {
    throw new Error('First name and surname are required.');
  }
  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  if (!contactNumber) {
    throw new Error('Primary contact number is required.');
  }
  if (!companyName) {
    throw new Error('Company name is required.');
  }
  if (!payload.declarationAgreed) {
    throw new Error('You must accept the legal declaration to complete onboarding.');
  }

  // 2. SYNCHRONIZE INTO CLIENT LIST (calc_clients)
  // Check if client exists in calc_clients
  let clientId: string;
  const primaryPhone = mobileNumber || contactNumber || landlineNumber;

  const notesText = [
    `Onboarded via Lunar Sign on ${formatSaDate(new Date())}`,
    regNumber ? `Reg No: ${regNumber}` : null,
    landlineNumber ? `Landline: ${landlineNumber}` : null,
    mobileNumber ? `Mobile: ${mobileNumber}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const existingClient = await dbQuery(
    `SELECT id, notes FROM calc_clients
     WHERE org_id = $1 AND (LOWER(email) = $2 OR LOWER(name) = $3)
     LIMIT 1`,
    [orgId, email, companyName.toLowerCase()]
  );

  if (existingClient.rows.length > 0) {
    clientId = existingClient.rows[0].id;
    const oldNotes = existingClient.rows[0].notes || '';
    const updatedNotes = oldNotes ? `${oldNotes}\n${notesText}` : notesText;

    await dbQuery(
      `UPDATE calc_clients
       SET name = $1,
           contact_person = $2,
           email = $3,
           phone = $4,
           notes = $5,
           status = 'active',
           updated_at = NOW()
       WHERE id = $6`,
      [companyName, fullName, email, primaryPhone, updatedNotes, clientId]
    );
  } else {
    const newClient = await dbQuery(
      `INSERT INTO calc_clients (
        org_id, name, contact_person, email, phone, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, 'active'
      ) RETURNING id`,
      [orgId, companyName, fullName, email, primaryPhone, notesText]
    );
    clientId = newClient.rows[0].id;
  }

  // 3 & 4. Concurrently synchronize into Contacts and finalize Submission in parallel
  const contactUpsertQuery = dbQuery(
    `INSERT INTO contacts (org_id, name, email, phone, role)
     VALUES ($1, $2, $3, $4, 'signer')
     ON CONFLICT (org_id, email) DO UPDATE
     SET name = EXCLUDED.name,
         phone = COALESCE(EXCLUDED.phone, contacts.phone),
         updated_at = NOW()`,
    [orgId, fullName, email, primaryPhone]
  );

  const submissionUpdateQuery = dbQuery(
    `UPDATE onboarding_submissions
     SET status = 'submitted',
         client_id = $1,
         first_name = $2,
         last_name = $3,
         full_name = $4,
         email = $5,
         contact_number = $6,
         mobile_number = $7,
         landline_number = $8,
         company_name = $9,
         registration_number = $10,
         answers = $11,
         signature_data_url = $12,
         signer_declaration_agreed = true,
         signer_ip = $13,
         signer_user_agent = $14,
         submitted_at = NOW(),
         updated_at = NOW()
     WHERE token = $15`,
    [
      clientId,
      firstName,
      lastName,
      fullName,
      email,
      contactNumber,
      mobileNumber,
      landlineNumber,
      companyName,
      regNumber,
      JSON.stringify(payload.answers || {}),
      payload.signatureDataUrl || null,
      ip || null,
      userAgent || null,
      token,
    ]
  );

  await Promise.all([contactUpsertQuery, submissionUpdateQuery]);

  const domain =
    payload.baseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://lunar-sign.netlify.app';
  const viewUrl = `${domain}/onboard/${token}`;
  const submittedAtFormatted = formatSaDate(new Date());

  // 5 & 6. Send notification to Business Owner and confirmation receipt to Client in parallel
  await Promise.allSettled([
    emailService.sendClientOnboardingCompleted({
      to: orgReplyTo,
      businessName: orgName,
      clientName: fullName,
      companyName,
      email,
      phone: primaryPhone,
      registrationNumber: regNumber,
      submittedAtFormatted,
      viewUrl,
      isClientReceipt: false,
    }),
    emailService.sendClientOnboardingCompleted({
      to: email,
      businessName: orgName,
      clientName: fullName,
      companyName,
      email,
      phone: primaryPhone,
      registrationNumber: regNumber,
      submittedAtFormatted,
      viewUrl,
      isClientReceipt: true,
    }),
  ]);

  return { success: true, submissionId: current.id, clientId };
}
