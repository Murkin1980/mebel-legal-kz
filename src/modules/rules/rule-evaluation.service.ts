import { v4 as uuidv4 } from 'uuid';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AppError, forbidden, notFound } from '@/modules/shared/errors';
import type { ContractPackageCheck, ContractRuleEvaluation, UserRole } from '@/modules/shared/types';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';

type RuleLogic = {
  required_fields?: string[];
  risk_if?: Array<{ field: string; equals?: unknown; message?: string }>;
  applicable_project_types?: string[];
  applicable_customer_types?: string[];
};
type EvaluationRule = { id: string; code: string; title: string; logic: RuleLogic; source_revision_id: string };
type EvaluationCase = { customer_type: string; project_type: string };

export class RuleEvaluationService {
  async evaluatePackage(packageId: string, legalCaseId: string, userId: string, commandId = uuidv4()) {
    const supabase = await createClient();
    const { data: legalCase, error: caseError } = await supabase.from('legal_cases').select('organization_id,customer_type,project_type').eq('id', legalCaseId).single();
    if (caseError) throw new AppError('INTERNAL_ERROR', caseError.message, 500);
    if (!legalCase) throw notFound('Legal case not found');
    const { data: membership, error: membershipError } = await supabase.from('organization_memberships').select('role').eq('organization_id', legalCase.organization_id).eq('user_id', userId).eq('status','active').single();
    if (membershipError && membershipError.code !== 'PGRST116') throw new AppError('INTERNAL_ERROR', membershipError.message, 500);
    if (!membership || !ROLE_PERMISSIONS.manage_packages[membership.role as UserRole]) throw forbidden('Insufficient permissions to evaluate package');
    const { data: pkg, error: packageError } = await supabase.from('contract_packages').select('*').eq('id', packageId).eq('legal_case_id', legalCaseId).single();
    if (packageError) throw new AppError('INTERNAL_ERROR', packageError.message, 500);
    if (!pkg) throw notFound('Contract package not found');
    const { data: rules, error: rulesError } = await supabase.from('legal_rules').select('id,code,title,logic,source_revision_id').eq('organization_id', legalCase.organization_id).eq('status','approved');
    if (rulesError) throw new AppError('INTERNAL_ERROR', rulesError.message, 500);
    const { data: revisions, error: revisionsError } = await supabase.from('legal_source_revisions').select('id,status').in('id', (rules || []).map(r => r.source_revision_id));
    if (revisionsError) throw new AppError('INTERNAL_ERROR', revisionsError.message, 500);
    const approvedRevisionIds = new Set((revisions || []).filter(r => r.status === 'approved').map(r => r.id));
    const content = (pkg.content_snapshot || {}) as Record<string, unknown>;
    const results = (rules || []).filter(r => approvedRevisionIds.has(r.source_revision_id)).map(rule => evaluateRule(rule, legalCase, content));
    const status = results.some(r => r.result === 'fail') ? 'failed' : results.some(r => r.result === 'warning') ? 'warnings' : 'passed';
    const summary = { total: results.length, pass: results.filter(r => r.result === 'pass').length, fail: results.filter(r => r.result === 'fail').length, warning: results.filter(r => r.result === 'warning').length, skipped: (rules || []).length - results.length };
    const rows = results.map(r => ({ ...r, organization_id: legalCase.organization_id, legal_case_id: legalCaseId, contract_package_id: packageId, package_version: pkg.version, evaluated_by: userId, command_id: commandId }));
    const serviceClient = await createServiceClient();
    const { data: persisted, error: persistError } = await serviceClient.rpc('persist_contract_package_check', { p_organization_id: legalCase.organization_id, p_legal_case_id: legalCaseId, p_contract_package_id: packageId, p_package_version: pkg.version, p_status: status, p_summary: summary, p_results: rows, p_evaluated_by: userId, p_command_id: commandId });
    if (persistError || !persisted?.check) throw new AppError('INTERNAL_ERROR', persistError?.message || 'Failed to persist package check', 500);
    const { data: storedResults, error: storedResultsError } = await supabase.from('contract_rule_evaluations').select('*').eq('contract_package_id', packageId).eq('package_version', pkg.version).eq('command_id', commandId).order('code');
    if (storedResultsError) throw new AppError('INTERNAL_ERROR', storedResultsError.message, 500);
    return { check: persisted.check as ContractPackageCheck, results: (storedResults || rows) as ContractRuleEvaluation[] };
  }

  async getPackageCheck(packageId: string, organizationId: string) {
    const supabase = await createClient();
    const { data: check, error: checkError } = await supabase.from('contract_package_checks').select('*').eq('contract_package_id', packageId).eq('organization_id', organizationId).order('evaluated_at',{ascending:false}).limit(1).maybeSingle();
    if (checkError) throw new AppError('INTERNAL_ERROR', checkError.message, 500);
    if (!check) return null;
    const { data: results, error: resultsError } = await supabase.from('contract_rule_evaluations').select('*').eq('contract_package_id', packageId).eq('organization_id', organizationId).eq('package_version', check.package_version).order('code');
    if (resultsError) throw new AppError('INTERNAL_ERROR', resultsError.message, 500);
    return { check: check as ContractPackageCheck, results: (results || []) as ContractRuleEvaluation[] };
  }
}

export function evaluateRule(rule: EvaluationRule, legalCase: EvaluationCase, content: Record<string, unknown>) {
    const logic = (rule.logic || {}) as RuleLogic;
    if (logic.applicable_project_types && !logic.applicable_project_types.includes(legalCase.project_type)) return { rule_id: rule.id, source_revision_id: rule.source_revision_id, result: 'not_applicable', code: rule.code, message: 'Rule is not applicable to this project type', evidence: { project_type: legalCase.project_type }, evaluated_at: new Date().toISOString() };
    if (logic.applicable_customer_types && !logic.applicable_customer_types.includes(legalCase.customer_type)) return { rule_id: rule.id, source_revision_id: rule.source_revision_id, result: 'not_applicable', code: rule.code, message: 'Rule is not applicable to this customer type', evidence: { customer_type: legalCase.customer_type }, evaluated_at: new Date().toISOString() };
    const missing = (logic.required_fields || []).filter(field => content[field] === undefined || content[field] === null || content[field] === '');
    if (missing.length) return { rule_id: rule.id, source_revision_id: rule.source_revision_id, result: 'fail', code: rule.code, message: `Missing required fields: ${missing.join(', ')}`, evidence: { missing_fields: missing }, evaluated_at: new Date().toISOString() };
    const risk = (logic.risk_if || []).find(condition => content[condition.field] === condition.equals);
    if (risk) return { rule_id: rule.id, source_revision_id: rule.source_revision_id, result: 'warning', code: rule.code, message: risk.message || 'Known risk condition detected', evidence: { field: risk.field, value: content[risk.field] }, evaluated_at: new Date().toISOString() };
    return { rule_id: rule.id, source_revision_id: rule.source_revision_id, result: 'pass', code: rule.code, message: 'Rule passed', evidence: {}, evaluated_at: new Date().toISOString() };
}

export const ruleEvaluationService = new RuleEvaluationService();
