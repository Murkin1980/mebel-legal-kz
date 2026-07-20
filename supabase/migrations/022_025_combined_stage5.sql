-- Migration: 022_change_orders_and_claims
-- Description: Change orders and claims tables for Stage 5
-- Date: 2026-07-20

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'requested', 'approved', 'rejected', 'applied', 'cancelled')),
  change_type TEXT NOT NULL
    CHECK (change_type IN ('scope', 'price', 'deadline', 'terms', 'other')),
  delta_amount BIGINT NOT NULL CHECK (delta_amount <> 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT change_orders_unique_number UNIQUE (organization_id, number)
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID REFERENCES contract_packages(id),
  change_order_id UUID REFERENCES change_orders(id),
  type TEXT NOT NULL
    CHECK (type IN ('quality', 'deadline', 'payment', 'scope', 'other')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved', 'withdrawn')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  resolution_rule_ids UUID[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT check_resolved_fields CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL AND resolution_summary IS NOT NULL)
    OR
    (status <> 'resolved')
  )
);

-- Migration: 023_rls_change_orders_claims
-- Description: RLS policies for change_orders and claims
-- Date: 2026-07-20

-- change_orders
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_orders_select" ON change_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "change_orders_insert" ON change_orders
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager')
        AND status = 'active'
    )
  );

CREATE POLICY "change_orders_update" ON change_orders
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "change_orders_delete" ON change_orders
  FOR DELETE USING (false);

-- claims
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claims_select" ON claims
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "claims_insert" ON claims
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "claims_update" ON claims
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

CREATE POLICY "claims_delete" ON claims
  FOR DELETE USING (false);

-- Migration: 024_grants_change_orders_claims
-- Description: GRANT/REVOKE for change_orders and claims
-- Date: 2026-07-20

REVOKE ALL ON change_orders FROM anon, authenticated;
REVOKE ALL ON claims FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON change_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON claims TO authenticated;

GRANT ALL ON change_orders TO service_role;
GRANT ALL ON claims TO service_role;

-- Migration: 025_indexes_change_orders_claims
-- Description: Indexes for change_orders and claims
-- Date: 2026-07-20

CREATE INDEX idx_change_orders_org ON change_orders(organization_id);
CREATE INDEX idx_change_orders_org_status ON change_orders(organization_id, status);
CREATE INDEX idx_change_orders_case ON change_orders(legal_case_id);
CREATE INDEX idx_change_orders_package ON change_orders(contract_package_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);

CREATE INDEX idx_claims_org ON claims(organization_id);
CREATE INDEX idx_claims_org_status ON claims(organization_id, status);
CREATE INDEX idx_claims_case ON claims(legal_case_id);
CREATE INDEX idx_claims_package ON claims(contract_package_id);
CREATE INDEX idx_claims_change_order ON claims(change_order_id);
CREATE INDEX idx_claims_status ON claims(status);
