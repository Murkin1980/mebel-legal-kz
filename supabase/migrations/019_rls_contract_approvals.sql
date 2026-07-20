-- Migration: 019_rls_contract_approvals
-- Description: RLS policies for contract_approvals
-- Date: 2026-07-20

ALTER TABLE contract_approvals ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read
CREATE POLICY "contract_approvals_select" ON contract_approvals
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: owner, manager can create
CREATE POLICY "contract_approvals_insert" ON contract_approvals
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
        AND status = 'active'
    )
  );

-- UPDATE: owner, legal_reviewer can approve/reject/revoke
CREATE POLICY "contract_approvals_update" ON contract_approvals
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- DELETE: forbidden (append-only)
CREATE POLICY "contract_approvals_delete" ON contract_approvals
  FOR DELETE USING (false);
