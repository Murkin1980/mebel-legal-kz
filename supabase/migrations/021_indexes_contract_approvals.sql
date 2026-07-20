-- Migration: 021_indexes_contract_approvals
-- Description: Indexes for contract_approvals
-- Date: 2026-07-20

CREATE INDEX idx_contract_approvals_org ON contract_approvals(organization_id);
CREATE INDEX idx_contract_approvals_org_status ON contract_approvals(organization_id, status);
CREATE INDEX idx_contract_approvals_case ON contract_approvals(legal_case_id);
CREATE INDEX idx_contract_approvals_package ON contract_approvals(contract_package_id);
CREATE INDEX idx_contract_approvals_package_status ON contract_approvals(contract_package_id, status);
CREATE INDEX idx_contract_approvals_status ON contract_approvals(status);
