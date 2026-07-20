-- Migration: 020_grants_contract_approvals
-- Description: GRANT/REVOKE for contract_approvals
-- Date: 2026-07-20

REVOKE ALL ON contract_approvals FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON contract_approvals TO authenticated;

GRANT ALL ON contract_approvals TO service_role;
