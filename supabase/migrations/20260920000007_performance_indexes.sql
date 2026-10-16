-- Performance Optimization Indexes
-- Resolves query lag on multi-tenant lookups, client item calculations, and onboarding submissions

CREATE INDEX IF NOT EXISTS idx_calc_clients_org_created 
  ON calc_clients (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calc_clients_email 
  ON calc_clients (lower(email));

CREATE INDEX IF NOT EXISTS idx_calc_clients_name 
  ON calc_clients (lower(name));

CREATE INDEX IF NOT EXISTS idx_calc_client_items_composite 
  ON calc_client_items (client_id, product_id);

CREATE INDEX IF NOT EXISTS idx_profiles_org_id 
  ON profiles (org_id);

CREATE INDEX IF NOT EXISTS idx_documents_org_id 
  ON documents (org_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_org_created 
  ON onboarding_submissions (org_id, created_at DESC);
