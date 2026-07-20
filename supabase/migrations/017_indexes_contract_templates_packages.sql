-- Migration: 017_indexes_contract_templates_packages
-- Description: Indexes for contract_templates and contract_packages
-- Date: 2026-07-20

CREATE INDEX idx_contract_templates_org ON contract_templates(organization_id);
CREATE INDEX idx_contract_templates_org_status ON contract_templates(organization_id, status);
CREATE INDEX idx_contract_templates_customer_type ON contract_templates(customer_type);
CREATE INDEX idx_contract_templates_project_type ON contract_templates(project_type);
CREATE INDEX idx_contract_packages_case ON contract_packages(legal_case_id);
CREATE INDEX idx_contract_packages_case_version ON contract_packages(legal_case_id, version);
CREATE INDEX idx_contract_packages_status ON contract_packages(status);
CREATE INDEX idx_contract_packages_template_code ON contract_packages(template_code);
