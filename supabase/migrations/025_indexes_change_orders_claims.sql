-- Migration: 025_indexes_change_orders_claims
-- Description: Indexes for change_orders and claims
-- Date: 2026-07-20

-- change_orders indexes
CREATE INDEX idx_change_orders_org ON change_orders(organization_id);
CREATE INDEX idx_change_orders_org_status ON change_orders(organization_id, status);
CREATE INDEX idx_change_orders_case ON change_orders(legal_case_id);
CREATE INDEX idx_change_orders_package ON change_orders(contract_package_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);

-- claims indexes
CREATE INDEX idx_claims_org ON claims(organization_id);
CREATE INDEX idx_claims_org_status ON claims(organization_id, status);
CREATE INDEX idx_claims_case ON claims(legal_case_id);
CREATE INDEX idx_claims_package ON claims(contract_package_id);
CREATE INDEX idx_claims_change_order ON claims(change_order_id);
CREATE INDEX idx_claims_status ON claims(status);
