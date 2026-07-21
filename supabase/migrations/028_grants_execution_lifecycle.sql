-- Migration: 028_grants_execution_lifecycle
-- Description: GRANT/REVOKE for contract_execution_phases, execution_checkpoints, execution_payments_summary
-- Date: 2026-07-20

REVOKE ALL ON contract_execution_phases FROM anon, authenticated;
REVOKE ALL ON execution_checkpoints FROM anon, authenticated;
REVOKE ALL ON execution_payments_summary FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON contract_execution_phases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON execution_checkpoints TO authenticated;
GRANT SELECT, INSERT, UPDATE ON execution_payments_summary TO authenticated;

GRANT ALL ON contract_execution_phases TO service_role;
GRANT ALL ON execution_checkpoints TO service_role;
GRANT ALL ON execution_payments_summary TO service_role;
