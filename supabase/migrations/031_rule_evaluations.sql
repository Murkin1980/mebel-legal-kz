-- Stage 3: deterministic contract package rule evaluations (append-only)
CREATE TABLE contract_rule_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  package_version INTEGER NOT NULL,
  rule_id UUID NOT NULL REFERENCES legal_rules(id),
  source_revision_id UUID NOT NULL REFERENCES legal_source_revisions(id),
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'warning', 'not_applicable')),
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_by UUID NOT NULL REFERENCES auth.users(id),
  command_id UUID NOT NULL,
  UNIQUE (command_id, rule_id)
);

CREATE TABLE contract_package_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_case_id UUID NOT NULL REFERENCES legal_cases(id) ON DELETE CASCADE,
  contract_package_id UUID NOT NULL REFERENCES contract_packages(id) ON DELETE CASCADE,
  package_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'warnings')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_by UUID NOT NULL REFERENCES auth.users(id),
  command_id UUID NOT NULL UNIQUE
);

ALTER TABLE contract_rule_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_package_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_rule_evaluations_select" ON contract_rule_evaluations FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "contract_rule_evaluations_insert" ON contract_rule_evaluations FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND role IN ('owner','manager','legal_reviewer') AND status = 'active')
);
CREATE POLICY "contract_rule_evaluations_update" ON contract_rule_evaluations FOR UPDATE USING (false);
CREATE POLICY "contract_rule_evaluations_delete" ON contract_rule_evaluations FOR DELETE USING (false);

CREATE POLICY "contract_package_checks_select" ON contract_package_checks FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "contract_package_checks_insert" ON contract_package_checks FOR INSERT WITH CHECK (
  organization_id IN (SELECT organization_id FROM organization_memberships WHERE user_id = auth.uid() AND role IN ('owner','manager','legal_reviewer') AND status = 'active')
);
CREATE POLICY "contract_package_checks_update" ON contract_package_checks FOR UPDATE USING (false);
CREATE POLICY "contract_package_checks_delete" ON contract_package_checks FOR DELETE USING (false);

REVOKE ALL ON contract_rule_evaluations, contract_package_checks FROM anon, authenticated;
GRANT SELECT ON contract_rule_evaluations, contract_package_checks TO authenticated;
GRANT ALL ON contract_rule_evaluations, contract_package_checks TO service_role;

CREATE INDEX contract_rule_evaluations_case_idx ON contract_rule_evaluations(organization_id, legal_case_id, evaluated_at DESC);
CREATE INDEX contract_rule_evaluations_package_idx ON contract_rule_evaluations(contract_package_id, package_version);
CREATE INDEX contract_package_checks_case_idx ON contract_package_checks(organization_id, legal_case_id, evaluated_at DESC);
