-- Migration: 026_execution_lifecycle
-- Description: Contract execution phases, checkpoints, and payment summaries for Stage 6
-- Date: 2026-07-20

-- =============================================
-- Enum types
-- =============================================
CREATE TYPE execution_phase_name AS ENUM (
  'drafting',
  'internal_review',
  'client_negotiation',
  'signed',
  'in_production',
  'delivered',
  'archived'
);

CREATE TYPE execution_phase_status AS ENUM (
  'active',
  'on_hold',
  'closed'
);

CREATE TYPE checkpoint_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'reopened'
);

CREATE TYPE checkpoint_assigned_role AS ENUM (
  'owner',
  'manager',
  'legal_reviewer',
  'operations'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'partial',
  'paid',
  'overdue'
);

-- =============================================
-- Table: contract_execution_phases
-- =============================================
CREATE TABLE contract_execution_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  current_phase execution_phase_name NOT NULL DEFAULT 'drafting',
  status execution_phase_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT unique_execution_phase UNIQUE (organization_id, legal_case_id, contract_package_id)
);

-- =============================================
-- Table: execution_checkpoints
-- =============================================
CREATE TABLE execution_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_phase_id UUID NOT NULL REFERENCES contract_execution_phases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status checkpoint_status NOT NULL DEFAULT 'pending',
  assigned_role checkpoint_assigned_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- =============================================
-- Table: execution_payments_summary
-- =============================================
CREATE TABLE execution_payments_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  total_amount BIGINT NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status payment_status NOT NULL DEFAULT 'pending',
  last_payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL REFERENCES auth.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT unique_payment_summary UNIQUE (organization_id, legal_case_id, contract_package_id),
  CONSTRAINT paid_amount_not_exceed_total CHECK (paid_amount <= total_amount)
);
