// Lunar Sign TypeScript Domain Types

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type DocumentStatus = 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided' | 'expired';
export type RecipientRole = 'signer' | 'approver' | 'filler' | 'viewer';
export type RecipientStatus = 'pending' | 'opened' | 'in_progress' | 'signed' | 'declined';
export type RecipientAuthMethod = 'none' | 'access_code' | 'email_otp';
export type SignatureMethod = 'drawn' | 'typed' | 'uploaded';
export type ActorType = 'admin' | 'recipient' | 'system';

export type FieldType =
  | 'signature'
  | 'initials'
  | 'full_name'
  | 'email'
  | 'date_signed'
  | 'text'
  | 'number'
  | 'currency'
  | 'sa_id'
  | 'sa_vat'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'date_picker'
  | 'attachment';

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  email_footer_text: string;
  reply_to_email: string;
  custom_domain?: string | null;
  retention_days: number;
  purge_voided_drafts_days: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  is_active: boolean;
  totp_enabled: boolean;
  require_password_change: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  created_by?: string | null;
  title: string;
  message?: string | null;
  original_filename: string;
  original_mime_type: string;
  storage_path_original: string;
  storage_path_pdf: string;
  storage_path_signed?: string | null;
  storage_path_certificate?: string | null;
  page_count: number;
  status: DocumentStatus;
  signing_order_enforced: boolean;
  expires_at?: string | null;
  reminder_interval_days: number;
  last_reminder_sent_at?: string | null;
  completed_at?: string | null;
  voided_reason?: string | null;
  original_hash?: string | null;
  final_hash?: string | null;
  pades_signature_applied: boolean;
  created_at: string;
  updated_at: string;
  recipients?: Recipient[];
  fields?: DocumentField[];
  audit_events?: AuditEvent[];
}

export interface Recipient {
  id: string;
  document_id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: RecipientRole;
  order_index: number;
  status: RecipientStatus;
  token_hash?: string;
  token_expires_at?: string;
  access_code_hash?: string | null;
  auth_method: RecipientAuthMethod;
  consent_given_at?: string | null;
  opened_at?: string | null;
  signed_at?: string | null;
  declined_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  geo_country?: string | null;
  geo_city?: string | null;
  created_at: string;
  color?: string; // Client UI helper
}

export interface DocumentField {
  id: string;
  document_id: string;
  recipient_id?: string | null; // null = sender field
  type: FieldType;
  page: number;
  x_pct: number; // 0 - 100%
  y_pct: number; // 0 - 100%
  width_pct: number; // 0 - 100%
  height_pct: number; // 0 - 100%
  required: boolean;
  label?: string | null;
  placeholder?: string | null;
  default_value?: string | null;
  options?: string[] | null; // For dropdown / radio
  validation_rule?: Record<string, unknown> | null;
  read_only: boolean;
  value?: string | null;
  value_meta?: Record<string, unknown> | null;
  completed_at?: string | null;
  created_at: string;
}

export interface SignatureRecord {
  id: string;
  field_id: string;
  recipient_id: string;
  method: SignatureMethod;
  font_family?: string | null;
  image_storage_path?: string | null;
  signature_data?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  document_id: string;
  recipient_id?: string | null;
  actor_type: ActorType;
  event_type: string;
  description: string;
  ip_address?: string | null;
  user_agent?: string | null;
  geo_country?: string | null;
  geo_city?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Template {
  id: string;
  org_id: string;
  name: string;
  description?: string | null;
  storage_path_pdf: string;
  field_definitions: Array<Omit<DocumentField, 'id' | 'document_id'>>;
  recipient_roles: Array<{ role_key: string; role_name: string; color: string }>;
  usage_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  org_id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: RecipientRole;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  name: string;
  key_prefix: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  org_id: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailLogEntry {
  id: string;
  document_id?: string | null;
  recipient_id?: string | null;
  template: string;
  to_email: string;
  subject: string;
  provider_message_id?: string | null;
  status: string;
  error?: string | null;
  sent_at: string;
}
