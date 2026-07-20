/**
 * Claim domain service.
 *
 * Handles claim operations with:
 * - Tenant isolation via legal_case_id → organization_id lookup
 * - Role-based authorization
 * - Append-only (UPDATE/DELETE forbidden at DB level for app roles)
 * - Claim state machine with prerequisite checks
 * - Domain commands with audit events
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
  preconditionFailed,
} from '@/modules/shared/errors';
import type {
  Claim,
  ClaimStatus,
  UserRole,
} from '@/modules/shared/types';
import { CLAIM_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createClaimSchema,
  transitionClaimStatusSchema,
  type CreateClaimInput,
  type TransitionClaimStatusInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class ClaimService {
  /**
   * Get organization ID from a legal case
   */
  private async getOrgIdFromCase(supabase: SupabaseClient, legalCaseId: string): Promise<string> {
    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('organization_id')
      .eq('id', legalCaseId)
      .single();

    if (!legalCase) {
      throw notFound('Legal case not found');
    }

    return legalCase.organization_id;
  }

  /**
   * Create a new claim (command: OpenClaim)
   */
  async createClaim(
    input: CreateClaimInput,
    userId: string,
    commandId?: string
  ): Promise<Claim> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createClaimSchema.parse(input);

    // Resolve organization from case
    const organizationId = await this.getOrgIdFromCase(supabase, validated.legalCaseId);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_claims[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create claims');
    }

    // Ensure case is not cancelled
    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('status')
      .eq('id', validated.legalCaseId)
      .single();

    if (!legalCase || legalCase.status === 'cancelled') {
      throw forbidden('Cannot create claim for cancelled case');
    }

    // Validate package if provided
    if (validated.contractPackageId) {
      const { data: pkg } = await supabase
        .from('contract_packages')
        .select('id')
        .eq('id', validated.contractPackageId)
        .eq('legal_case_id', validated.legalCaseId)
        .single();

      if (!pkg) {
        throw notFound('Contract package not found');
      }
    }

    // Validate change order if provided
    if (validated.changeOrderId) {
      const { data: co } = await supabase
        .from('change_orders')
        .select('id')
        .eq('id', validated.changeOrderId)
        .eq('legal_case_id', validated.legalCaseId)
        .single();

      if (!co) {
        throw notFound('Change order not found');
      }
    }

    // Create claim
    const { data: claim, error } = await supabase
      .from('claims')
      .insert({
        organization_id: organizationId,
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId || null,
        change_order_id: validated.changeOrderId || null,
        type: validated.type,
        status: 'open',
        opened_by: userId,
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create claim', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'claim.created',
      entity_type: 'claim',
      entity_id: claim.id,
      command_id: cmdId,
      idempotency_key: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        change_order_id: validated.changeOrderId,
        type: validated.type,
      },
    });

    return claim;
  }

  /**
   * Transition claim status
   */
  async transitionClaim(
    input: TransitionClaimStatusInput,
    userId: string,
    commandId?: string
  ): Promise<Claim> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = transitionClaimStatusSchema.parse(input);

    // Get current claim
    const { data: claim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', validated.claimId)
      .single();

    if (!claim) {
      throw notFound('Claim not found');
    }

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', claim.organization_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('No active membership');
    }

    const role = membership.role as UserRole;

    // Check specific permissions
    if (validated.targetStatus === 'in_review') {
      if (!ROLE_PERMISSIONS.manage_claims[role]) {
        throw forbidden('Insufficient permissions to move claim to review');
      }
    }

    if (validated.targetStatus === 'resolved') {
      if (!ROLE_PERMISSIONS.resolve_claims[role]) {
        throw forbidden('Insufficient permissions to resolve claims');
      }
      // Require resolution summary
      if (!validated.resolutionSummary || validated.resolutionSummary.trim().length === 0) {
        throw preconditionFailed('Resolution summary is required');
      }
    }

    if (validated.targetStatus === 'withdrawn') {
      if (!ROLE_PERMISSIONS.manage_claims[role]) {
        throw forbidden('Insufficient permissions to withdraw claims');
      }
    }

    // Check state machine
    const allowedTransitions = CLAIM_TRANSITIONS[claim.status as ClaimStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(claim.status, validated.targetStatus);
    }

    // Transition status
    const updatePayload: Record<string, unknown> = { status: validated.targetStatus };

    if (validated.targetStatus === 'resolved') {
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolution_summary = validated.resolutionSummary;
      if (validated.resolutionRuleIds) {
        updatePayload.resolution_rule_ids = validated.resolutionRuleIds;
      }
    }

    if (validated.targetStatus === 'in_review' && validated.metadata) {
      updatePayload.metadata = { ...claim.metadata, ...validated.metadata };
    }

    const { data: updated, error } = await supabase
      .from('claims')
      .update(updatePayload)
      .eq('id', validated.claimId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update claim status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: claim.organization_id,
      actor_user_id: userId,
      event_type: 'claim.status_changed',
      entity_type: 'claim',
      entity_id: validated.claimId,
      command_id: cmdId,
      idempotency_key: cmdId,
      payload: {
        legal_case_id: claim.legal_case_id,
        from_status: claim.status,
        to_status: validated.targetStatus,
      },
    });

    return updated;
  }

  /**
   * Get claim by ID
   */
  async getClaim(claimId: string): Promise<Claim> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (error || !data) {
      throw notFound('Claim not found');
    }

    return data;
  }

  /**
   * Get claims for a case
   */
  async getCaseClaims(
    legalCaseId: string,
    options: { status?: ClaimStatus } = {}
  ): Promise<Claim[]> {
    const supabase = await createClient();

    let query = supabase
      .from('claims')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .order('opened_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch claims', 500);
    }

    return data || [];
  }
}

export const claimService = new ClaimService();
