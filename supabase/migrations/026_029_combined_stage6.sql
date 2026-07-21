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

-- Migration: 027_rls_execution_lifecycle
-- Description: RLS policies for contract_execution_phases, execution_checkpoints, execution_payments_summary

-- =============================================
-- contract_execution_phases RLS
-- =============================================
ALTER TABLE contract_execution_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "execution_phases_select" ON contract_execution_phases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "execution_phases_insert" ON contract_execution_phases
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "execution_phases_update" ON contract_execution_phases
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "execution_phases_delete" ON contract_execution_phases
  FOR DELETE USING (false);

-- =============================================
-- execution_checkpoints RLS
-- =============================================
ALTER TABLE execution_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkpoints_select" ON execution_checkpoints
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "checkpoints_insert" ON execution_checkpoints
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "checkpoints_update" ON execution_checkpoints
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'manager', 'legal_reviewer', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "checkpoints_delete" ON execution_checkpoints
  FOR DELETE USING (false);

-- =============================================
-- execution_payments_summary RLS
-- =============================================
ALTER TABLE execution_payments_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_summary_select" ON execution_payments_summary
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "payments_summary_insert" ON execution_payments_summary
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "payments_summary_update" ON execution_payments_summary
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'operations')
        AND status = 'active'
    )
  );

CREATE POLICY "payments_summary_delete" ON execution_payments_summary
  FOR DELETE USING (false);

-- Migration: 028_grants_execution_lifecycle
-- Description: GRANT/REVOKE for Stage 6 tables

REVOKE ALL ON contract_execution_phases FROM anon, authenticated;
REVOKE ALL ON execution_checkpoints FROM anon, authenticated;
REVOKE ALL ON execution_payments_summary FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON contract_execution_phases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON execution_checkpoints TO authenticated;
GRANT SELECT, INSERT, UPDATE ON execution_payments_summary TO authenticated;

GRANT ALL ON contract_execution_phases TO service_role;
GRANT ALL ON execution_checkpoints TO service_role;
GRANT ALL ON execution_payments_summary TO service_role;

-- Migration: 029_indexes_execution_lifecycle
-- Description: Indexes for Stage 6 tables

CREATE INDEX idx_exec_phases_org ON contract_execution_phases(organization_id);
CREATE INDEX idx_exec_phases_org_phase ON contract_execution_phases(organization_id, current_phase);
CREATE INDEX idx_exec_phases_case ON contract_execution_phases(legal_case_id);
CREATE INDEX idx_exec_phases_package ON contract_execution_phases(contract_package_id);
CREATE INDEX idx_exec_phases_status ON contract_execution_phases(status);

CREATE INDEX idx_checkpoints_org ON execution_checkpoints(organization_id);
CREATE INDEX idx_checkpoints_phase ON execution_checkpoints(execution_phase_id);
CREATE INDEX idx_checkpoints_phase_status ON execution_checkpoints(execution_phase_id, status);
CREATE INDEX idx_checkpoints_assigned_role ON execution_checkpoints(assigned_role);
CREATE INDEX idx_checkpoints_status ON execution_checkpoints(status);

CREATE INDEX idx_payments_org ON execution_payments_summary(organization_id);
CREATE INDEX idx_payments_org_status ON execution_payments_summary(organization_id, status);
CREATE INDEX idx_payments_case ON execution_payments_summary(legal_case_id);
CREATE INDEX idx_payments_package ON execution_payments_summary(contract_package_id);
CREATE INDEX idx_payments_status ON execution_payments_summary(status);
