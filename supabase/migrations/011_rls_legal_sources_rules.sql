-- Migration: 011_rls_legal_sources_rules
-- Description: RLS policies for legal_sources, legal_source_revisions, legal_rules
-- Date: 2026-07-20

-- Enable RLS
ALTER TABLE legal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_source_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_rules ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LEGAL SOURCES POLICIES
-- ============================================================

-- Members can see sources for their organizations
CREATE POLICY "legal_sources_select" ON legal_sources
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Owners, managers, legal_reviewers can create sources
CREATE POLICY "legal_sources_insert" ON legal_sources
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- Only owners and legal_reviewers can update sources (status changes, approve)
CREATE POLICY "legal_sources_update" ON legal_sources
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- No one can delete sources (use deprecated status)
CREATE POLICY "legal_sources_delete" ON legal_sources
  FOR DELETE
  USING (false);

-- ============================================================
-- LEGAL SOURCE REVISIONS POLICIES
-- ============================================================

-- Members can see revisions for sources in their organizations
CREATE POLICY "legal_source_revisions_select" ON legal_source_revisions
  FOR SELECT
  USING (
    source_id IN (
      SELECT ls.id
      FROM legal_sources ls
      JOIN organization_memberships om ON om.organization_id = ls.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Owners, managers, legal_reviewers can create revisions
CREATE POLICY "legal_source_revisions_insert" ON legal_source_revisions
  FOR INSERT
  WITH CHECK (
    source_id IN (
      SELECT ls.id
      FROM legal_sources ls
      JOIN organization_memberships om ON om.organization_id = ls.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager', 'legal_reviewer')
        AND om.status = 'active'
    )
  );

-- Only owners and legal_reviewers can update revisions (approve)
CREATE POLICY "legal_source_revisions_update" ON legal_source_revisions
  FOR UPDATE
  USING (
    source_id IN (
      SELECT ls.id
      FROM legal_sources ls
      JOIN organization_memberships om ON om.organization_id = ls.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'legal_reviewer')
        AND om.status = 'active'
    )
  );

-- No one can delete revisions (append-only)
CREATE POLICY "legal_source_revisions_delete" ON legal_source_revisions
  FOR DELETE
  USING (false);

-- ============================================================
-- LEGAL RULES POLICIES
-- ============================================================

-- Members can see rules for their organizations
CREATE POLICY "legal_rules_select" ON legal_rules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Owners, managers, legal_reviewers can create rules
CREATE POLICY "legal_rules_insert" ON legal_rules
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- Only owners and legal_reviewers can update rules (approve)
CREATE POLICY "legal_rules_update" ON legal_rules
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'legal_reviewer')
        AND status = 'active'
    )
  );

-- No one can delete rules (use retired status)
CREATE POLICY "legal_rules_delete" ON legal_rules
  FOR DELETE
  USING (false);
