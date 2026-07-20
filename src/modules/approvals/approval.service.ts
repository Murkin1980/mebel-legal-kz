/**
 * Contract Approval domain service.
 *
 * Handles approval operations with:
 * - Tenant isolation via legal_case_id → organization_id lookup
 * - Role-based authorization
 * - Append-only (UPDATE/DELETE forbidden at DB level for app roles)
 * - Approval state machine with prerequisite checks
 * - Self-approval prevention
 * - Domain commands with audit events
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
  conflict,
  preconditionFailed,
} from '@/modules/shared/errors';
import type {
  ContractApproval,
  ApprovalStatus,
  UserRole,
} from '@/modules/shared/types';
import { APPROVAL_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createContractApprovalSchema,
  transitionContractApprovalStatusSchema,
  type CreateContractApprovalInput,
  type TransitionContractApprovalStatusInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class ContractApprovalService {
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
   * Create a new contract approval (command: CreateContractApproval)
   * Creates an approval request for a specific package version
   */
  async createApproval(
    input: CreateContractApprovalInput,
    userId: string,
    commandId?: string
  ): Promise<ContractApproval> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createContractApprovalSchema.parse(input);

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

    if (!membership || !ROLE_PERMISSIONS.manage_approvals[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create approvals');
    }

    // Ensure case is not cancelled
    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('status')
      .eq('id', validated.legalCaseId)
      .single();

    if (!legalCase || legalCase.status === 'cancelled') {
      throw forbidden('Cannot create approval for cancelled case');
    }

    // Ensure package exists and belongs to this case
    const { data: pkg } = await supabase
      .from('contract_packages')
      .select('id, status')
      .eq('id', validated.contractPackageId)
      .eq('legal_case_id', validated.legalCaseId)
      .single();

    if (!pkg) {
      throw notFound('Contract package not found');
    }

    // Ensure package is not retired
    if (pkg.status === 'retired') {
      throw preconditionFailed('Cannot create approval for retired package');
    }

    // Check no active approval exists for this package
    const { data: activeApproval } = await supabase
      .from('contract_approvals')
      .select('id')
      .eq('contract_package_id', validated.contractPackageId)
      .in('status', ['draft', 'pending_review'])
      .limit(1)
      .single();

    if (activeApproval) {
      throw conflict('An active approval already exists for this package');
    }

    // Create approval
    const { data: approval, error } = await supabase
      .from('contract_approvals')
      .insert({
        organization_id: organizationId,
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        status: 'draft',
        requested_by: userId,
        notes: validated.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create contract approval', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'contract_approval.created',
      entity_type: 'contract_approval',
      entity_id: approval.id,
      command_id: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        status: 'draft',
      },
    });

    return approval;
  }

  /**
   * Transition approval status
   * Validates state machine transitions and prerequisite checks
   */
  async transitionApproval(
    input: TransitionContractApprovalStatusInput,
    userId: string,
    commandId?: string
  ): Promise<ContractApproval> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = transitionContractApprovalStatusSchema.parse(input);

    // Get current approval
    const { data: approval } = await supabase
      .from('contract_approvals')
      .select('*')
      .eq('id', validated.approvalId)
      .single();

    if (!approval) {
      throw notFound('Contract approval not found');
    }

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', approval.organization_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('No active membership');
    }

    // Approve/reject requires legal_reviewer or owner
    const isDecision = validated.targetStatus === 'approved' || validated.targetStatus === 'rejected';
    if (isDecision && !ROLE_PERMISSIONS.decide_approvals[membership.role as UserRole]) {
      throw forbidden(`Insufficient permissions to ${validated.targetStatus} approval`);
    }

    // Pending/revoke requires owner or manager
    const isManagement = validated.targetStatus === 'pending_review' || validated.targetStatus === 'revoked';
    if (isManagement && !ROLE_PERMISSIONS.manage_approvals[membership.role as UserRole]) {
      throw forbidden(`Insufficient permissions to transition approval to ${validated.targetStatus}`);
    }

    // Self-approval prevention
    if (isDecision && userId === approval.requested_by) {
      throw forbidden('Cannot approve or reject your own approval request');
    }

    // Check state machine
    const allowedTransitions = APPROVAL_TRANSITIONS[approval.status as ApprovalStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(approval.status, validated.targetStatus);
    }

    // Notes required for reject/revoke
    if (
      (validated.targetStatus === 'rejected' || validated.targetStatus === 'revoked') &&
      (!validated.notes || validated.notes.trim().length === 0)
    ) {
      throw preconditionFailed('Notes are required for reject/revoke');
    }

    // Transition status
    const updatePayload: Record<string, unknown> = { status: validated.targetStatus };

    // Set decided_by/decided_at for terminal states
    if (isDecision || validated.targetStatus === 'revoked') {
      updatePayload.decided_by = userId;
      updatePayload.decided_at = new Date().toISOString();
      if (validated.notes) {
        updatePayload.notes = validated.notes;
      }
    }

    const { data: updated, error } = await supabase
      .from('contract_approvals')
      .update(updatePayload)
      .eq('id', validated.approvalId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update approval status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: approval.organization_id,
      actor_user_id: userId,
      event_type: 'contract_approval.status_changed',
      entity_type: 'contract_approval',
      entity_id: validated.approvalId,
      command_id: cmdId,
      payload: {
        legal_case_id: approval.legal_case_id,
        contract_package_id: approval.contract_package_id,
        from_status: approval.status,
        to_status: validated.targetStatus,
      },
    });

    return updated;
  }

  /**
   * Get approval by ID
   */
  async getApproval(approvalId: string): Promise<ContractApproval> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contract_approvals')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (error || !data) {
      throw notFound('Contract approval not found');
    }

    return data;
  }

  /**
   * Get approvals for a package
   */
  async getPackageApprovals(
    contractPackageId: string,
    options: { status?: ApprovalStatus } = {}
  ): Promise<ContractApproval[]> {
    const supabase = await createClient();

    let query = supabase
      .from('contract_approvals')
      .select('*')
      .eq('contract_package_id', contractPackageId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch approvals', 500);
    }

    return data || [];
  }

  /**
   * Get approvals for a case
   */
  async getCaseApprovals(
    legalCaseId: string,
    options: { status?: ApprovalStatus } = {}
  ): Promise<ContractApproval[]> {
    const supabase = await createClient();

    let query = supabase
      .from('contract_approvals')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch approvals', 500);
    }

    return data || [];
  }

  /**
   * Get all approvals for an organization
   */
  async getOrganizationApprovals(
    organizationId: string,
    options: { status?: ApprovalStatus; legalCaseId?: string } = {}
  ): Promise<ContractApproval[]> {
    const supabase = await createClient();

    let query = supabase
      .from('contract_approvals')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.legalCaseId) {
      query = query.eq('legal_case_id', options.legalCaseId);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch approvals', 500);
    }

    return data || [];
  }
}

export const contractApprovalService = new ContractApprovalService();
