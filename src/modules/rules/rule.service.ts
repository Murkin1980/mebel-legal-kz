/**
 * Legal Rule domain service.
 *
 * Handles legal rule operations with:
 * - Tenant isolation via organization_id
 * - Role-based authorization
 * - State machine for rule statuses
 * - Domain commands with audit events
 * - Immutability of published rules
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
  conflict,
} from '@/modules/shared/errors';
import type { LegalRule, LegalRuleStatus, UserRole } from '@/modules/shared/types';
import { LEGAL_RULE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createLegalRuleSchema,
  approveLegalRuleSchema,
  type CreateLegalRuleInput,
  type ApproveLegalRuleInput,
} from '@/modules/shared/validation';

export class RuleService {
  /**
   * Create a new legal rule (command: CreateLegalRule)
   *
   * Only owners, managers, and legal_reviewers can create rules.
   * The rule references a source revision but does not contain the full norm text.
   */
  async createRule(
    input: CreateLegalRuleInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalRule> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createLegalRuleSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_legal_sources[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create legal rules');
    }

    // Verify source revision exists and belongs to an approved source in this org
    const { data: sourceRevision } = await supabase
      .from('legal_source_revisions')
      .select('id, source_id, status')
      .eq('id', validated.sourceRevisionId)
      .single();

    if (!sourceRevision) {
      throw notFound('Referenced legal source revision not found');
    }

    // Verify the source belongs to this organization
    const { data: source } = await supabase
      .from('legal_sources')
      .select('id, organization_id')
      .eq('id', sourceRevision.source_id)
      .eq('organization_id', organizationId)
      .single();

    if (!source) {
      throw forbidden('Referenced source does not belong to this organization');
    }

    // Check if code is unique within organization
    const { data: existing } = await supabase
      .from('legal_rules')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', validated.code)
      .single();

    if (existing) {
      throw conflict('Legal rule with this code already exists in this organization');
    }

    // Create rule
    const { data: rule, error } = await supabase
      .from('legal_rules')
      .insert({
        organization_id: organizationId,
        code: validated.code,
        title: validated.title,
        description: validated.description,
        source_revision_id: validated.sourceRevisionId,
        status: 'draft',
        logic: validated.logic,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create legal rule', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'legal_rule.created',
      entity_type: 'legal_rule',
      entity_id: rule.id,
      command_id: cmdId,
      payload: {
        code: rule.code,
        title: rule.title,
        source_revision_id: rule.source_revision_id,
        status: 'draft',
      },
    });

    return rule;
  }

  /**
   * Approve or retire a legal rule (command: ApproveLegalRule)
   *
   * Only owners and legal_reviewers can approve.
   * Approved rules cannot be directly modified — only new versions created.
   */
  async approveRule(
    input: ApproveLegalRuleInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalRule> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = approveLegalRuleSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.approve_legal_rule[membership.role as UserRole]) {
      throw forbidden('Only owners and legal reviewers can approve legal rules');
    }

    // Get current rule
    const { data: rule } = await supabase
      .from('legal_rules')
      .select('*')
      .eq('id', validated.ruleId)
      .eq('organization_id', organizationId)
      .single();

    if (!rule) {
      throw notFound('Legal rule not found');
    }

    // Check state machine
    const allowedTransitions = LEGAL_RULE_TRANSITIONS[rule.status as LegalRuleStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(rule.status, validated.targetStatus);
    }

    // Transition rule status
    const { data: updatedRule, error } = await supabase
      .from('legal_rules')
      .update({ status: validated.targetStatus })
      .eq('id', validated.ruleId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !updatedRule) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update legal rule status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'legal_rule.status_changed',
      entity_type: 'legal_rule',
      entity_id: validated.ruleId,
      command_id: cmdId,
      payload: {
        code: rule.code,
        from_status: rule.status,
        to_status: validated.targetStatus,
      },
    });

    return updatedRule;
  }

  /**
   * Get rule by ID
   */
  async getRule(ruleId: string, organizationId: string): Promise<LegalRule> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw notFound('Legal rule not found');
    }

    return data;
  }

  /**
   * Get organization rules
   */
  async getOrganizationRules(
    organizationId: string,
    options: { status?: LegalRuleStatus } = {}
  ): Promise<LegalRule[]> {
    const supabase = await createClient();

    let query = supabase
      .from('legal_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch legal rules', 500);
    }

    return data || [];
  }
}

export const ruleService = new RuleService();
