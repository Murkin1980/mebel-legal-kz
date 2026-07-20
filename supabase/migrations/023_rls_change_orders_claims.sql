-- Migration: 023_rls_change_orders_claims
-- Description: RLS policies for change_orders and claims
-- Date: 2026-07-20

-- =============================================
-- change_orders
-- =============================================
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read
CREATE POLICY "change_orders_select" ON change_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: owner, manager can create
CREATE POLICY "change_orders_insert" ON change_orders
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
        AND status = 'active'
    )
  );

-- UPDATE: owner, legal_reviewer can approve/reject, owner+manager can request/cancel
CREATE POLICY "change_orders_update" ON change_orders
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- DELETE: forbidden (append-only)
CREATE POLICY "change_orders_delete" ON change_orders
  FOR DELETE USING (false);

-- =============================================
-- claims
-- =============================================
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can read
CREATE POLICY "claims_select" ON claims
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- INSERT: owner, manager can create
CREATE POLICY "claims_insert" ON claims
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- UPDATE: owner, manager, legal_reviewer can update
CREATE POLICY "claims_update" ON claims
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- DELETE: forbidden (append-only)
CREATE POLICY "claims_delete" ON claims
  FOR DELETE USING (false);
