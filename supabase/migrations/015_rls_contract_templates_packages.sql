-- Migration: 015_rls_contract_templates_packages
-- Description: RLS policies for contract_templates and contract_packages
-- Date: 2026-07-20

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_packages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CONTRACT TEMPLATES POLICIES
-- ============================================================

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

-- ============================================================
-- CONTRACT PACKAGES POLICIES
-- ============================================================

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
