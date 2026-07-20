-- Stage 2 Combined Migration: Apply all 4 migrations in one go
-- Run this in Supabase SQL Editor

-- ============================================================
-- 010: Create tables
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  source_system TEXT NOT NULL CHECK (source_system IN ('adilet', 'internal', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'deprecated')),
  is_allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(organization_id, canonical_url)
);

CREATE TABLE IF NOT EXISTS legal_source_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  effective_from DATE,
  effective_to DATE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetched_by UUID NOT NULL REFERENCES auth.users(id),
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_id, revision_number)
);

CREATE TABLE IF NOT EXISTS legal_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source_revision_id UUID NOT NULL REFERENCES legal_source_revisions(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'retired')),
  logic JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(organization_id, code)
);

-- ============================================================
-- 011: RLS policies
-- ============================================================
ALTER TABLE legal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_source_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_rules ENABLE ROW LEVEL SECURITY;

-- Legal sources
CREATE POLICY "legal_sources_select" ON legal_sources
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "legal_sources_insert" ON legal_sources
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'legal_reviewer') AND status = 'active'
    )
  );

CREATE POLICY "legal_sources_update" ON legal_sources
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'legal_reviewer') AND status = 'active'
    )
  );

CREATE POLICY "legal_sources_delete" ON legal_sources
  FOR DELETE USING (false);

-- Legal source revisions
CREATE POLICY "legal_source_revisions_select" ON legal_source_revisions
  FOR SELECT USING (
    source_id IN (
      SELECT ls.id FROM legal_sources ls
      JOIN organization_memberships om ON om.organization_id = ls.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "legal_source_revisions_insert" ON legal_source_revisions
  FOR INSERT WITH CHECK (
    source_id IN (
      SELECT ls.id FROM legal_sources ls
      JOIN organization_memberships om ON om.organization_id = ls.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'manager', 'legal_reviewer') AND om.status = 'active'
    )
  );

CREATE POLICY "legal_source_revisions_update" ON legal_source_revisions
  FOR UPDATE USING (
    source_id IN (
      SELECT ls.id FROM legal_sources ls
      JOIN organization_memberships om ON om.organization_id = ls.organization_id
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'legal_reviewer') AND om.status = 'active'
    )
  );

CREATE POLICY "legal_source_revisions_delete" ON legal_source_revisions
  FOR DELETE USING (false);

-- Legal rules
CREATE POLICY "legal_rules_select" ON legal_rules
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "legal_rules_insert" ON legal_rules
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'legal_reviewer') AND status = 'active'
    )
  );

CREATE POLICY "legal_rules_update" ON legal_rules
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'legal_reviewer') AND status = 'active'
    )
  );

CREATE POLICY "legal_rules_delete" ON legal_rules
  FOR DELETE USING (false);

-- ============================================================
-- 012: Grants and revokes
-- ============================================================
REVOKE ALL ON legal_sources FROM anon, authenticated;
REVOKE ALL ON legal_source_revisions FROM anon, authenticated;
REVOKE ALL ON legal_rules FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON legal_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_source_revisions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON legal_rules TO authenticated;

GRANT ALL ON legal_sources TO service_role;
GRANT ALL ON legal_source_revisions TO service_role;
GRANT ALL ON legal_rules TO service_role;

-- ============================================================
-- 013: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_legal_sources_org ON legal_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_legal_sources_org_status ON legal_sources(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_sources_system ON legal_sources(source_system);
CREATE INDEX IF NOT EXISTS idx_legal_source_revisions_source ON legal_source_revisions(source_id);
CREATE INDEX IF NOT EXISTS idx_legal_source_revisions_source_status ON legal_source_revisions(source_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_rules_org ON legal_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_legal_rules_org_status ON legal_rules(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_legal_rules_source_revision ON legal_rules(source_revision_id);
