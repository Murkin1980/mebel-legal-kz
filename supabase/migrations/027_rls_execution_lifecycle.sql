-- Migration: 027_rls_execution_lifecycle
-- Description: RLS policies for contract_execution_phases, execution_checkpoints, execution_payments_summary
-- Date: 2026-07-20

-- =============================================
-- contract_execution_phases
-- =============================================
ALTER TABLE contract_execution_phases ENABLE ROW LEVEL SECURITY;

-- SELECT: org members and operations can read
CREATE POLICY "execution_phases_select" ON contract_execution_phases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: owner, manager, operations can create
CREATE POLICY "execution_phases_insert" ON contract_execution_phases
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'operations')
        AND status = 'active'
    )
  );

-- UPDATE: owner, manager, operations can transition
CREATE POLICY "execution_phases_update" ON contract_execution_phases
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'operations')
        AND status = 'active'
    )
  );

-- DELETE: forbidden (append-only)
CREATE POLICY "execution_phases_delete" ON contract_execution_phases
  FOR DELETE USING (false);

-- =============================================
-- execution_checkpoints
-- =============================================
ALTER TABLE execution_checkpoints ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read
CREATE POLICY "checkpoints_select" ON execution_checkpoints
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: owner, manager, legal_reviewer, operations can create
CREATE POLICY "checkpoints_insert" ON execution_checkpoints
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer', 'operations')
        AND status = 'active'
    )
  );

-- UPDATE: owner, manager, legal_reviewer, operations can manage
CREATE POLICY "checkpoints_update" ON execution_checkpoints
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer', 'operations')
        AND status = 'active'
    )
  );

-- DELETE: forbidden (append-only)
CREATE POLICY "checkpoints_delete" ON execution_checkpoints
  FOR DELETE USING (false);

-- =============================================
-- execution_payments_summary
-- =============================================
ALTER TABLE execution_payments_summary ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read
CREATE POLICY "payments_summary_select" ON execution_payments_summary
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: owner, operations can create/update
CREATE POLICY "payments_summary_insert" ON execution_payments_summary
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'operations')
        AND status = 'active'
    )
  );

-- UPDATE: owner, operations can update
CREATE POLICY "payments_summary_update" ON execution_payments_summary
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'operations')
        AND status = 'active'
    )
  );

-- DELETE: forbidden (append-only)
CREATE POLICY "payments_summary_delete" ON execution_payments_summary
  FOR DELETE USING (false);
