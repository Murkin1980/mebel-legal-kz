-- Migration: 024_grants_change_orders_claims
-- Description: GRANT/REVOKE for change_orders and claims
-- Date: 2026-07-20

REVOKE ALL ON change_orders FROM anon, authenticated;
REVOKE ALL ON claims FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON change_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON claims TO authenticated;

GRANT ALL ON change_orders TO service_role;
GRANT ALL ON claims TO service_role;
