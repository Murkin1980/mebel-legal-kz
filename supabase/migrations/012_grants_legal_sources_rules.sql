-- Migration: 012_grants_legal_sources_rules
-- Description: Grants and revokes for legal_sources, legal_source_revisions, legal_rules
-- Date: 2026-07-20

-- Revoke direct table access from anon and authenticated roles
REVOKE ALL ON legal_sources FROM anon, authenticated;
REVOKE ALL ON legal_source_revisions FROM anon, authenticated;
REVOKE ALL ON legal_rules FROM anon, authenticated;

-- Grant what's needed through RLS
GRANT SELECT, INSERT, UPDATE ON legal_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_source_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_rules TO authenticated;

-- Service role can do everything (server-side only)
GRANT ALL ON legal_sources TO service_role;
GRANT ALL ON legal_source_revisions TO service_role;
GRANT ALL ON legal_rules TO service_role;
