-- Migration: 006_grants_and_revokes
-- Description: Grants and revokes for security
-- Date: 2026-07-20

-- Revoke direct table access from anon and authenticated roles
-- (RLS policies handle access control)
REVOKE ALL ON organizations FROM anon, authenticated;
REVOKE ALL ON organization_memberships FROM anon, authenticated;
REVOKE ALL ON legal_cases FROM anon, authenticated;
REVOKE ALL ON audit_events FROM anon, authenticated;

-- Grant only what's needed through RLS
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_cases TO authenticated;
GRANT SELECT ON audit_events TO authenticated;

-- Service role can do everything (used server-side only)
GRANT ALL ON organizations TO service_role;
GRANT ALL ON organization_memberships TO service_role;
GRANT ALL ON legal_cases TO service_role;
GRANT ALL ON audit_events TO service_role;

-- Revoke service role from frontend
-- This is enforced at application level - service role never goes to browser
