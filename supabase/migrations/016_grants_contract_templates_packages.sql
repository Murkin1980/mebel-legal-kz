-- Migration: 016_grants_contract_templates_packages
-- Description: GRANT/REVOKE for contract_templates and contract_packages
-- Date: 2026-07-20

REVOKE ALL ON contract_templates FROM anon, authenticated;
REVOKE ALL ON contract_packages FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON contract_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON contract_packages TO authenticated;

GRANT ALL ON contract_templates TO service_role;
GRANT ALL ON contract_packages TO service_role;
