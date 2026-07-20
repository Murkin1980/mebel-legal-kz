/**
 * Legal Case domain service.
 *
 * Handles legal case operations with:
 * - State machine for status transitions
 * - Optimistic concurrency
 * - Idempotent commands
 * - Audit events
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
  optimisticConcurrencyConflict,
  validationError,
} from '@/modules/shared/errors';
import type { LegalCase, CaseStatus, UserRole } from '@/modules/shared/types';
import { CASE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createLegalCaseSchema,
  updateLegalCaseBasicsSchema,
  transitionLegalCaseStatusSchema,
  type CreateLegalCaseInput,
  type UpdateLegalCaseBasicsInput,
  type TransitionLegalCaseStatusInput,
} from '@/modules/shared/validation';

export class CaseService {
  /**
   * Create a new legal case (command: CreateLegalCase)
   *
   * Only owners, managers, and designers can create cases.
   */
  async createCase(
    input: CreateLegalCaseInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalCase> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    // Validate input
    const validated = createLegalCaseSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.create_case[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create cases');
    }

    // Check if case number is unique within organization
    const { data: existing } = await supabase
      .from('legal_cases')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('case_number', validated.caseNumber)
      .single();

    if (existing) {
      throw validationError('Case number already exists in this organization');
    }

    // Create case
    const { data: legalCase, error } = await supabase
      .from('legal_cases')
      .insert({
        organization_id: organizationId,
        case_number: validated.caseNumber,
        title: validated.title,
        customer_type: validated.customerType,
        customer_display_name: validated.customerDisplayName,
        project_type: validated.projectType,
        currency: validated.currency,
        total_amount_tiyin: validated.totalAmountTiyin ? BigInt(validated.totalAmountTiyin) : null,
        source_type: validated.sourceType,
        source_external_id: validated.sourceExternalId || null,
        source_external_version: validated.sourceExternalVersion || null,
        created_by: userId,
        status: 'draft',
        version: 1,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create legal case', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'case.created',
      entity_type: 'legal_case',
      entity_id: legalCase.id,
      command_id: cmdId,
      payload: {
        case_number: legalCase.case_number,
        title: legalCase.title,
        customer_type: legalCase.customer_type,
        status: legalCase.status,
      },
    });

    return legalCase;
  }

  /**
   * Update case basics (command: UpdateLegalCaseBasics)
   *
   * Uses optimistic concurrency via version field.
   */
  async updateCaseBasics(
    input: UpdateLegalCaseBasicsInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalCase> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    // Validate input
    const validated = updateLegalCaseBasicsSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.update_case_basics[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to update cases');
    }

    // Get current case with version
    const { data: currentCase } = await supabase
      .from('legal_cases')
      .select('*')
      .eq('id', validated.caseId)
      .eq('organization_id', organizationId)
      .single();

    if (!currentCase) {
      throw notFound('Legal case not found');
    }

    // Optimistic concurrency check
    if (currentCase.version !== validated.version) {
      throw optimisticConcurrencyConflict();
    }

    // Update case
    const updateData: Record<string, unknown> = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.customerType !== undefined) updateData.customer_type = validated.customerType;
    if (validated.customerDisplayName !== undefined) updateData.customer_display_name = validated.customerDisplayName;
    if (validated.projectType !== undefined) updateData.project_type = validated.projectType;
    if (validated.totalAmountTiyin !== undefined) {
      updateData.total_amount_tiyin = validated.totalAmountTiyin ? BigInt(validated.totalAmountTiyin) : null;
    }

    // Increment version
    updateData.version = currentCase.version + 1;

    const { data: updatedCase, error } = await supabase
      .from('legal_cases')
      .update(updateData)
      .eq('id', validated.caseId)
      .eq('organization_id', organizationId)
      .eq('version', validated.version) // Double-check version
      .select()
      .single();

    if (error || !updatedCase) {
      throw optimisticConcurrencyConflict();
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'case.updated',
      entity_type: 'legal_case',
      entity_id: validated.caseId,
      command_id: cmdId,
      payload: {
        changes: updateData,
        previous_version: validated.version,
        new_version: updatedCase.version,
      },
    });

    return updatedCase;
  }

  /**
   * Transition case status (command: TransitionLegalCaseStatus)
   *
   * Follows state machine rules.
   */
  async transitionStatus(
    input: TransitionLegalCaseStatusInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalCase> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    // Validate input
    const validated = transitionLegalCaseStatusSchema.parse(input);

    // Get current case
    const { data: currentCase } = await supabase
      .from('legal_cases')
      .select('*')
      .eq('id', validated.caseId)
      .eq('organization_id', organizationId)
      .single();

    if (!currentCase) {
      throw notFound('Legal case not found');
    }

    // Optimistic concurrency check
    if (currentCase.version !== validated.version) {
      throw optimisticConcurrencyConflict();
    }

    // Check state machine
    const allowedTransitions = CASE_TRANSITIONS[currentCase.status as CaseStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(currentCase.status, validated.targetStatus);
    }

    // Check permission for specific transitions
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('Not a member of this organization');
    }

    const role = membership.role as UserRole;

    // Check role permissions for specific transitions
    if (validated.targetStatus === 'approved' && !ROLE_PERMISSIONS.transition_to_approved[role]) {
      throw forbidden('Only owners and legal reviewers can approve cases');
    }

    if (
      (validated.targetStatus === 'closed' || validated.targetStatus === 'cancelled') &&
      !ROLE_PERMISSIONS.close_or_cancel[role]
    ) {
      throw forbidden('Insufficient permissions to close or cancel cases');
    }

    // Transition status
    const { data: updatedCase, error } = await supabase
      .from('legal_cases')
      .update({
        status: validated.targetStatus,
        version: currentCase.version + 1,
      })
      .eq('id', validated.caseId)
      .eq('organization_id', organizationId)
      .eq('version', validated.version)
      .select()
      .single();

    if (error || !updatedCase) {
      throw optimisticConcurrencyConflict();
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'case.status_changed',
      entity_type: 'legal_case',
      entity_id: validated.caseId,
      command_id: cmdId,
      payload: {
        from_status: currentCase.status,
        to_status: validated.targetStatus,
        previous_version: validated.version,
        new_version: updatedCase.version,
      },
    });

    return updatedCase;
  }

  /**
   * Get case by ID
   */
  async getCase(caseId: string, organizationId: string): Promise<LegalCase> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_cases')
      .select('*')
      .eq('id', caseId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw notFound('Legal case not found');
    }

    return data;
  }

  /**
   * Get cases for organization
   */
  async getOrganizationCases(organizationId: string): Promise<LegalCase[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_cases')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch cases', 500);
    }

    return data || [];
  }
}

export const caseService = new CaseService();
