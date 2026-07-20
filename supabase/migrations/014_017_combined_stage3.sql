-- Combined migrations 014–017: Contract Templates & Packages (Stage 3)
-- Run this in Supabase SQL Editor to apply all Stage 3 changes
-- Date: 2026-07-20

-- ============================================================
-- 014: Tables
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

-- ============================================================
-- 015: RLS policies
-- ============================================================

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_templates_select" ON contract_templates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "contract_templates_insert" ON contract_templates
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "contract_templates_update" ON contract_templates
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "contract_templates_delete" ON contract_templates
  FOR DELETE USING (false);

CREATE POLICY "contract_packages_select" ON contract_packages
  FOR SELECT USING (
    legal_case_id IN (
      SELECT lc.id FROM legal_cases lc
      JOIN organization_memberships om ON om.organization_id = lc.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "contract_packages_insert" ON contract_packages
  FOR INSERT WITH CHECK (
    legal_case_id IN (
      SELECT lc.id FROM legal_cases lc
      JOIN organization_memberships om ON om.organization_id = lc.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager', 'legal_reviewer')
        AND om.status = 'active'
    )
  );

CREATE POLICY "contract_packages_update" ON contract_packages
  FOR UPDATE USING (
    legal_case_id IN (
      SELECT lc.id FROM legal_cases lc
      JOIN organization_memberships om ON om.organization_id = lc.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'legal_reviewer')
        AND om.status = 'active'
    )
  );

CREATE POLICY "contract_packages_delete" ON contract_packages
  FOR DELETE USING (false);

-- ============================================================
-- 016: GRANT/REVOKE
-- ============================================================

REVOKE ALL ON contract_templates FROM anon, authenticated;
REVOKE ALL ON contract_packages FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON contract_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON contract_packages TO authenticated;

GRANT ALL ON contract_templates TO service_role;
GRANT ALL ON contract_packages TO service_role;

-- ============================================================
-- 017: Indexes
-- ============================================================

CREATE INDEX idx_contract_templates_org ON contract_templates(organization_id);
CREATE INDEX idx_contract_templates_org_status ON contract_templates(organization_id, status);
CREATE INDEX idx_contract_templates_customer_type ON contract_templates(customer_type);
CREATE INDEX idx_contract_templates_project_type ON contract_templates(project_type);
CREATE INDEX idx_contract_packages_case ON contract_packages(legal_case_id);
CREATE INDEX idx_contract_packages_case_version ON contract_packages(legal_case_id, version);
CREATE INDEX idx_contract_packages_status ON contract_packages(status);
CREATE INDEX idx_contract_packages_template_code ON contract_packages(template_code);
