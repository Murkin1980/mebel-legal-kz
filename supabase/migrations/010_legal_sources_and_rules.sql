-- Migration: 010_legal_sources_and_rules
-- Description: Legal sources, revisions, and rules tables for Stage 2
-- Date: 2026-07-20

-- ============================================================
-- LEGAL SOURCES
-- ============================================================
CREATE TABLE legal_sources (
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

-- ============================================================
-- LEGAL SOURCE REVISIONS
-- ============================================================
CREATE TABLE legal_source_revisions (
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

-- ============================================================
-- LEGAL RULES
-- ============================================================
CREATE TABLE legal_rules (
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
