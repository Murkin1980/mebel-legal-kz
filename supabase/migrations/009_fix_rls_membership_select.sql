-- Migration: 009_fix_rls_membership_select
-- Description: Fix self-referencing RLS recursion on organization_memberships SELECT
-- Date: 2026-07-20

-- The original memberships_select policy used a subquery that referenced
-- organization_memberships from within its own RLS policy, causing infinite
-- recursion. PostgreSQL detects the recursion and returns empty results,
-- preventing users from seeing their own memberships.

-- Fix: allow users to read their own membership records directly.
-- The application code already checks status='active' and role for authorization.

DROP POLICY IF EXISTS "memberships_select" ON organization_memberships;

CREATE POLICY "memberships_select" ON organization_memberships
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Also fix organizations_select to avoid self-referencing through memberships.
-- Since we can now read our own memberships, we can simplify this.
DROP POLICY IF EXISTS "organizations_select" ON organizations;

CREATE POLICY "organizations_select" ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT om.organization_id 
      FROM organization_memberships om
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );
