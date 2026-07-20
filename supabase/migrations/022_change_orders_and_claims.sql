-- Migration: 022_change_orders_and_claims
-- Description: Change orders and claims tables for Stage 5
-- Date: 2026-07-20

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'requested', 'approved', 'rejected', 'applied', 'cancelled')),
  change_type TEXT NOT NULL
    CHECK (change_type IN ('scope', 'price', 'deadline', 'terms', 'other')),
  delta_amount BIGINT NOT NULL CHECK (delta_amount <> 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT change_orders_unique_number UNIQUE (organization_id, number)
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID REFERENCES contract_packages(id),
  change_order_id UUID REFERENCES change_orders(id),
  type TEXT NOT NULL
    CHECK (type IN ('quality', 'deadline', 'payment', 'scope', 'other')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved', 'withdrawn')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  resolution_rule_ids UUID[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT check_resolved_fields CHECK (
    (status = 'resolved' AND resolved_at IS NOT NULL AND resolution_summary IS NOT NULL)
    OR
    (status <> 'resolved')
  )
);
