-- Migration: 018_contract_approvals
-- Description: Contract approvals table for Stage 4
-- Date: 2026-07-20

CREATE TABLE contract_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'revoked')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  CONSTRAINT check_decided_fields CHECK (
    (status IN ('approved', 'rejected', 'revoked') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
    OR
    (status NOT IN ('approved', 'rejected', 'revoked'))
  )
);
