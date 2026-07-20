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
