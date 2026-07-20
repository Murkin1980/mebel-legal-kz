-- Migration: 005_rls_policies
-- Description: Row Level Security policies
-- Date: 2026-07-20

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS POLICIES
-- ============================================================

-- Users can only see organizations they are members of
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owners can create organizations
CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT
  WITH CHECK (true);

-- Only owners can update organizations
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- No one can delete organizations via API (use archived status)
CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE
  USING (false);

-- ============================================================
-- ORGANIZATION MEMBERSHIPS POLICIES
-- ============================================================

-- Users can see memberships for their organizations
CREATE POLICY "memberships_select" ON organization_memberships
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owners can add members
CREATE POLICY "memberships_insert" ON organization_memberships
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Only owners can update memberships
CREATE POLICY "memberships_update" ON organization_memberships
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- Only owners can remove members
CREATE POLICY "memberships_delete" ON organization_memberships
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

-- ============================================================
-- LEGAL CASES POLICIES
-- ============================================================

-- Users can see cases for their organizations
CREATE POLICY "cases_select" ON legal_cases
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Owners, managers, designers can create cases
CREATE POLICY "cases_insert" ON legal_cases
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'manager', 'designer') 
        AND status = 'active'
    )
  );

-- Owners, managers, designers can update cases
CREATE POLICY "cases_update" ON legal_cases
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'manager', 'designer') 
        AND status = 'active'
    )
  );

-- No one can delete cases via API
CREATE POLICY "cases_delete" ON legal_cases
  FOR DELETE
  USING (false);

-- ============================================================
-- AUDIT EVENTS POLICIES
-- ============================================================

-- Users can see audit events for their organizations
CREATE POLICY "audit_select" ON audit_events
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only service role can insert audit events (via server commands)
CREATE POLICY "audit_insert" ON audit_events
  FOR INSERT
  WITH CHECK (true);

-- No one can update audit events (append-only)
CREATE POLICY "audit_update" ON audit_events
  FOR UPDATE
  USING (false);

-- No one can delete audit events (append-only)
CREATE POLICY "audit_delete" ON audit_events
  FOR DELETE
  USING (false);
