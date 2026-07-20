-- Migration: 004_audit_events
-- Description: Audit events table (append-only)
-- Date: 2026-07-20

-- Audit events table
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  command_id UUID NOT NULL,
  idempotency_key TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}',
  previous_event_id UUID,
  request_correlation_id TEXT,
  UNIQUE(organization_id, command_id)
);

-- Indexes
CREATE INDEX idx_audit_events_organization_id ON audit_events(organization_id);
CREATE INDEX idx_audit_events_entity_type_entity_id ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_occurred_at ON audit_events(occurred_at);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
