-- Migration: 20260920000002_rls_policies.sql
-- Lunar Sign Row Level Security (RLS) Policies & Immutability Triggers

-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user's org_id from profile
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
    SELECT org_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. ORGANISATIONS POLICIES
CREATE POLICY "Users can view their own organisation"
    ON organisations FOR SELECT
    USING (id = auth_user_org_id());

CREATE POLICY "Owners and admins can update their organisation"
    ON organisations FOR UPDATE
    USING (id = auth_user_org_id() AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- 2. PROFILES POLICIES
CREATE POLICY "Users can view profiles in their organisation"
    ON profiles FOR SELECT
    USING (org_id = auth_user_org_id());

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins and owners can insert profiles in their org"
    ON profiles FOR INSERT
    WITH CHECK (org_id = auth_user_org_id() AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Admins and owners can delete/deactivate profiles in their org"
    ON profiles FOR DELETE
    USING (org_id = auth_user_org_id() AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- 3. DOCUMENTS POLICIES
CREATE POLICY "Users can view documents in their org"
    ON documents FOR SELECT
    USING (org_id = auth_user_org_id());

CREATE POLICY "Members, admins and owners can create documents in their org"
    ON documents FOR INSERT
    WITH CHECK (org_id = auth_user_org_id());

CREATE POLICY "Users can update documents in their org"
    ON documents FOR UPDATE
    USING (org_id = auth_user_org_id());

CREATE POLICY "Admins and owners can delete draft documents in their org"
    ON documents FOR DELETE
    USING (org_id = auth_user_org_id() AND status = 'draft');

-- 4. RECIPIENTS POLICIES
CREATE POLICY "Users can view recipients for their org documents"
    ON recipients FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = recipients.document_id AND documents.org_id = auth_user_org_id()
    ));

CREATE POLICY "Users can manage recipients for their org documents"
    ON recipients FOR ALL
    USING (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = recipients.document_id AND documents.org_id = auth_user_org_id()
    ));

-- 5. FIELDS POLICIES
CREATE POLICY "Users can view fields for their org documents"
    ON fields FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = fields.document_id AND documents.org_id = auth_user_org_id()
    ));

CREATE POLICY "Users can manage fields for their org documents"
    ON fields FOR ALL
    USING (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = fields.document_id AND documents.org_id = auth_user_org_id()
    ));

-- 6. SIGNATURES POLICIES
CREATE POLICY "Users can view signatures for their org documents"
    ON signatures FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM fields
        JOIN documents ON documents.id = fields.document_id
        WHERE fields.id = signatures.field_id AND documents.org_id = auth_user_org_id()
    ));

-- 7. AUDIT_EVENTS (Strict Append-Only: No Update, No Delete for anyone)
CREATE POLICY "Users can view audit events for their org documents"
    ON audit_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = audit_events.document_id AND documents.org_id = auth_user_org_id()
    ));

CREATE POLICY "Users and system can insert audit events"
    ON audit_events FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = audit_events.document_id AND documents.org_id = auth_user_org_id()
    ));

-- Append-only enforcement trigger for audit_events
CREATE OR REPLACE FUNCTION enforce_audit_events_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_events_immutable ON audit_events;
CREATE TRIGGER trg_audit_events_immutable
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW
EXECUTE FUNCTION enforce_audit_events_immutable();

-- 8. TEMPLATES POLICIES
CREATE POLICY "Users can view and manage templates in their org"
    ON templates FOR ALL
    USING (org_id = auth_user_org_id());

-- 9. EMAIL_LOG POLICIES
CREATE POLICY "Users can view email logs for their org documents"
    ON email_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM documents WHERE documents.id = email_log.document_id AND documents.org_id = auth_user_org_id()
    ));

-- 10. API_KEYS POLICIES
CREATE POLICY "Owners and admins can manage API keys"
    ON api_keys FOR ALL
    USING (org_id = auth_user_org_id() AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- 11. WEBHOOKS POLICIES
CREATE POLICY "Owners and admins can manage webhooks"
    ON webhooks FOR ALL
    USING (org_id = auth_user_org_id() AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- 12. CONTACTS POLICIES
CREATE POLICY "Users can view and manage contacts in their org"
    ON contacts FOR ALL
    USING (org_id = auth_user_org_id());
