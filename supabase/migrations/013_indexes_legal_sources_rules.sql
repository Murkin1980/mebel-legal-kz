-- Migration: 013_indexes_legal_sources_rules
-- Description: Indexes and constraints for legal_sources, legal_source_revisions, legal_rules
-- Date: 2026-07-20

-- Indexes for legal_sources
CREATE INDEX idx_legal_sources_org ON legal_sources(organization_id);
CREATE INDEX idx_legal_sources_org_status ON legal_sources(organization_id, status);
CREATE INDEX idx_legal_sources_system ON legal_sources(source_system);

-- Indexes for legal_source_revisions
CREATE INDEX idx_legal_source_revisions_source ON legal_source_revisions(source_id);
CREATE INDEX idx_legal_source_revisions_source_status ON legal_source_revisions(source_id, status);

-- Indexes for legal_rules
CREATE INDEX idx_legal_rules_org ON legal_rules(organization_id);
CREATE INDEX idx_legal_rules_org_status ON legal_rules(organization_id, status);
CREATE INDEX idx_legal_rules_source_revision ON legal_rules(source_revision_id);
