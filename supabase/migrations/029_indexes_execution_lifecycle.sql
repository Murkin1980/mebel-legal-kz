-- Migration: 029_indexes_execution_lifecycle
-- Description: Indexes for contract_execution_phases, execution_checkpoints, execution_payments_summary
-- Date: 2026-07-20

-- contract_execution_phases indexes
CREATE INDEX idx_exec_phases_org ON contract_execution_phases(organization_id);
CREATE INDEX idx_exec_phases_org_phase ON contract_execution_phases(organization_id, current_phase);
CREATE INDEX idx_exec_phases_case ON contract_execution_phases(legal_case_id);
CREATE INDEX idx_exec_phases_package ON contract_execution_phases(contract_package_id);
CREATE INDEX idx_exec_phases_status ON contract_execution_phases(status);

-- execution_checkpoints indexes
CREATE INDEX idx_checkpoints_org ON execution_checkpoints(organization_id);
CREATE INDEX idx_checkpoints_phase ON execution_checkpoints(execution_phase_id);
CREATE INDEX idx_checkpoints_phase_status ON execution_checkpoints(execution_phase_id, status);
CREATE INDEX idx_checkpoints_assigned_role ON execution_checkpoints(assigned_role);
CREATE INDEX idx_checkpoints_status ON execution_checkpoints(status);

-- execution_payments_summary indexes
CREATE INDEX idx_payments_org ON execution_payments_summary(organization_id);
CREATE INDEX idx_payments_org_status ON execution_payments_summary(organization_id, status);
CREATE INDEX idx_payments_case ON execution_payments_summary(legal_case_id);
CREATE INDEX idx_payments_package ON execution_payments_summary(contract_package_id);
CREATE INDEX idx_payments_status ON execution_payments_summary(status);
