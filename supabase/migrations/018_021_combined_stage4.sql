-- ============================================================
-- Combined migrations 018-021: Contract Approvals (Stage 4)
-- Apply via Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 018_contract_approvals.sql
CREATE TABLE contract_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'revoked')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  CONSTRAINT check_decided_fields CHECK (
    (status IN ('approved', 'rejected', 'revoked') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
    OR
    (status NOT IN ('approved', 'rejected', 'revoked'))
  )
);

-- 019_rls_contract_approvals.sql
ALTER TABLE contract_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_approvals_select" ON contract_approvals
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "contract_approvals_insert" ON contract_approvals
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
        AND status = 'active'
    )
  );

CREATE POLICY "contract_approvals_update" ON contract_approvals
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "contract_approvals_delete" ON contract_approvals
  FOR DELETE USING (false);

-- 020_grants_contract_approvals.sql
REVOKE ALL ON contract_approvals FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON contract_approvals TO authenticated;

GRANT ALL ON contract_approvals TO service_role;

-- 021_indexes_contract_approvals.sql
CREATE INDEX idx_contract_approvals_org ON contract_approvals(organization_id);
CREATE INDEX idx_contract_approvals_org_status ON contract_approvals(organization_id, status);
CREATE INDEX idx_contract_approvals_case ON contract_approvals(legal_case_id);
CREATE INDEX idx_contract_approvals_package ON contract_approvals(contract_package_id);
CREATE INDEX idx_contract_approvals_package_status ON contract_approvals(contract_package_id, status);
CREATE INDEX idx_contract_approvals_status ON contract_approvals(status);
