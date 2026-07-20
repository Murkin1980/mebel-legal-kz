-- Migration: 014_contract_templates_and_packages
-- Description: Contract templates and contract packages tables for Stage 3
-- Date: 2026-07-20

-- ============================================================
-- CONTRACT TEMPLATES
-- ============================================================
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'individual_entrepreneur', 'legal_entity')),
  project_type TEXT NOT NULL CHECK (project_type IN ('manufacture_only', 'manufacture_delivery', 'manufacture_delivery_installation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'expert_review', 'published', 'retired')),
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(organization_id, code)
);

-- ============================================================
-- CONTRACT PACKAGES
-- ============================================================
CREATE TABLE contract_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  template_code TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved_for_internal_use', 'published_for_consultation', 'retired')),
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_revision_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(legal_case_id, version)
);
