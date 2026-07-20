-- Migration: 001_extensions_and_functions.sql

-- Migration: 001_extensions_and_functions
-- Description: Extensions and helper functions
-- Date: 2026-07-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate case numbers
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(case_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM legal_cases;
  
  RETURN 'LC-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;


-- Migration: 002_organizations_and_memberships.sql

-- Migration: 002_organizations_and_memberships
-- Description: Organizations and memberships tables
-- Date: 2026-07-20

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'KZ',
  default_currency TEXT NOT NULL DEFAULT 'KZT',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for organizations.updated_at
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Organization memberships table
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'designer', 'legal_reviewer', 'observer')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organization_memberships_organization_id ON organization_memberships(organization_id);
CREATE INDEX idx_organization_memberships_user_id ON organization_memberships(user_id);


-- Migration: 003_legal_cases.sql

-- Migration: 003_legal_cases
-- Description: Legal cases table
-- Date: 2026-07-20

-- Legal cases table
CREATE TABLE legal_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'individual_entrepreneur', 'legal_entity')),
  customer_display_name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (project_type IN ('manufacture_only', 'manufacture_delivery', 'manufacture_delivery_installation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'data_collection', 'ready_for_review', 'approved', 'suspended', 'closed', 'cancelled')),
  currency TEXT NOT NULL DEFAULT 'KZT',
  total_amount_tiyin BIGINT CHECK (total_amount_tiyin >= 0),
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'interactive_kp', 'import')),
  source_external_id TEXT,
  source_external_version TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(organization_id, case_number)
);

-- Unique constraint for external source within organization
CREATE UNIQUE INDEX idx_legal_cases_external_source
  ON legal_cases(organization_id, source_external_id)
  WHERE source_external_id IS NOT NULL;

-- Trigger for legal_cases.updated_at
CREATE TRIGGER legal_cases_updated_at
  BEFORE UPDATE ON legal_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_legal_cases_organization_id ON legal_cases(organization_id);
CREATE INDEX idx_legal_cases_status ON legal_cases(status);
CREATE INDEX idx_legal_cases_case_number ON legal_cases(case_number);


-- Migration: 004_audit_events.sql

-- Migration: 004_audit_events
-- Description: Audit events table (append-only)
-- Date: 2026-07-20

-- Audit events table
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  command_id UUID NOT NULL,
  idempotency_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}',
  previous_event_id UUID,
  request_correlation_id TEXT,
  UNIQUE(organization_id, command_id)
);

-- Indexes
CREATE INDEX idx_audit_events_organization_id ON audit_events(organization_id);
CREATE INDEX idx_audit_events_entity_type_entity_id ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_occurred_at ON audit_events(occurred_at);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);


-- Migration: 005_rls_policies.sql

-- Migration: 005_rls_policies
-- Description: Row Level Security policies
-- Date: 2026-07-20

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS POLICIES
-- ============================================================

-- Users can only see organizations they are members of
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owners can create organizations
CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT
  WITH CHECK (true);

-- Only owners can update organizations
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- No one can delete organizations via API (use archived status)
CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE
  USING (false);

-- ============================================================
-- ORGANIZATION MEMBERSHIPS POLICIES
-- ============================================================

-- Users can see memberships for their organizations
CREATE POLICY "memberships_select" ON organization_memberships
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owners can add members
CREATE POLICY "memberships_insert" ON organization_memberships
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Only owners can update memberships
CREATE POLICY "memberships_update" ON organization_memberships
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Only owners can remove members
CREATE POLICY "memberships_delete" ON organization_memberships
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- ============================================================
-- LEGAL CASES POLICIES
-- ============================================================

-- Users can see cases for their organizations
CREATE POLICY "cases_select" ON legal_cases
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Owners, managers, designers can create cases
CREATE POLICY "cases_insert" ON legal_cases
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'manager', 'designer') 
        AND status = 'active'
    )
  );

-- Owners, managers, designers can update cases
CREATE POLICY "cases_update" ON legal_cases
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'manager', 'designer') 
        AND status = 'active'
    )
  );

-- No one can delete cases via API
CREATE POLICY "cases_delete" ON legal_cases
  FOR DELETE
  USING (false);

-- ============================================================
-- AUDIT EVENTS POLICIES
-- ============================================================

-- Users can see audit events for their organizations
CREATE POLICY "audit_select" ON audit_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only service role can insert audit events (via server commands)
CREATE POLICY "audit_insert" ON audit_events
  FOR INSERT
  WITH CHECK (true);

-- No one can update audit events (append-only)
CREATE POLICY "audit_update" ON audit_events
  FOR UPDATE
  USING (false);

-- No one can delete audit events (append-only)
CREATE POLICY "audit_delete" ON audit_events
  FOR DELETE
  USING (false);


-- Migration: 006_grants_and_revokes.sql

-- Migration: 006_grants_and_revokes
-- Description: Grants and revokes for security
-- Date: 2026-07-20

-- Revoke direct table access from anon and authenticated roles
-- (RLS policies handle access control)
REVOKE ALL ON organizations FROM anon, authenticated;
REVOKE ALL ON organization_memberships FROM anon, authenticated;
REVOKE ALL ON legal_cases FROM anon, authenticated;
REVOKE ALL ON audit_events FROM anon, authenticated;

-- Grant only what's needed through RLS
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_cases TO authenticated;
GRANT SELECT ON audit_events TO authenticated;

-- Service role can do everything (used server-side only)
GRANT ALL ON organizations TO service_role;
GRANT ALL ON organization_memberships TO service_role;
GRANT ALL ON legal_cases TO service_role;
GRANT ALL ON audit_events TO service_role;

-- Revoke service role from frontend
-- This is enforced at application level - service role never goes to browser


-- Migration: 007_indexes_and_constraints.sql

-- Migration: 007_indexes_and_constraints
-- Description: Additional indexes and constraints
-- Date: 2026-07-20

-- Additional composite indexes for performance
CREATE INDEX idx_legal_cases_org_status ON legal_cases(organization_id, status);
CREATE INDEX idx_legal_cases_org_created ON legal_cases(organization_id, created_at DESC);
CREATE INDEX idx_audit_events_org_occurred ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX idx_audit_events_org_event_type ON audit_events(organization_id, event_type);
CREATE INDEX idx_audit_events_org_entity ON audit_events(organization_id, entity_type, entity_id);

-- Check constraint for total_amount_tiyin
ALTER TABLE legal_cases ADD CONSTRAINT check_total_amount_tiyin
  CHECK (total_amount_tiyin IS NULL OR total_amount_tiyin >= 0);

-- Ensure case_number format
ALTER TABLE legal_cases ADD CONSTRAINT check_case_number_format
  CHECK (case_number ~ '^LC-[0-9]{6}$');


-- Migration: 008_seed_data.sql

-- Migration: 008_seed_data
-- Description: Seed data for demo/testing
-- Date: 2026-07-20

-- WARNING: This seed data uses SYNTHETIC data only
-- No real names, IIN, BIN, addresses or account numbers

-- Insert test organizations
INSERT INTO organizations (id, name, slug, country_code, default_currency, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ООО "Мебель-Тест"', 'mebel-test', 'KZ', 'KZT', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'ТОО "Стол и Стул"', 'stol-i-stul', 'KZ', 'KZT', 'active');

-- Note: User memberships and legal cases should be created through the application
-- after users sign up via Supabase Auth.
-- We cannot seed legal_cases here because created_by references auth.users(id)
-- and the auth users don't exist yet at seed time.



