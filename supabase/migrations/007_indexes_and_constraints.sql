-- Migration: 007_indexes_and_constraints
-- Description: Additional indexes and constraints
-- Date: 2026-07-20

-- Additional composite indexes for performance
CREATE INDEX idx_legal_cases_org_status ON legal_cases(organization_id, status);
CREATE INDEX idx_legal_cases_org_created ON legal_cases(organization_id, created_at DESC);
CREATE INDEX idx_audit_events_org_occurred ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX idx_audit_events_org_event_type ON audit_events(organization_id, event_type);
CREATE INDEX idx_audit_events_org_entity ON audit_events(organization_id, entity_type, entity_id);

-- Check constraint for total_amount_tiyin
ALTER TABLE legal_cases ADD CONSTRAINT check_total_amount_tiyin
  CHECK (total_amount_tiyin IS NULL OR total_amount_tiyin >= 0);

-- Ensure case_number format
ALTER TABLE legal_cases ADD CONSTRAINT check_case_number_format
  CHECK (case_number ~ '^LC-[0-9]{6}$');
