/**
 * Contract Package domain service.
 *
 * Handles package operations with:
 * - Tenant isolation via legal_case_id → organization_id lookup
 * - Role-based authorization
 * - Append-only versioning (UPDATE/DELETE forbidden at DB level)
 * - Package state machine with prerequisite checks (source revisions must be approved)
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
  ContractPackage,
  ContractPackageStatus,
  UserRole,
} from '@/modules/shared/types';
import { PACKAGE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createContractPackageSchema,
  transitionContractPackageStatusSchema,
  type CreateContractPackageInput,
  type TransitionContractPackageStatusInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class ContractPackageService {
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
   * Create a new contract package (command: CreateContractPackage)
   * Package versioning: auto-increments per legal_case_id
   */
  async createPackage(
    input: CreateContractPackageInput,
    userId: string,
    commandId?: string
  ): Promise<ContractPackage> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createContractPackageSchema.parse(input);

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

    if (!membership || !ROLE_PERMISSIONS.manage_packages[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create contract packages');
    }

    // Ensure case is not cancelled
    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('status')
      .eq('id', validated.legalCaseId)
      .single();

    if (!legalCase || legalCase.status === 'cancelled') {
      throw forbidden('Cannot create package for cancelled case');
    }

    // Ensure template is published
    const { data: template } = await supabase
      .from('contract_templates')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('code', validated.templateCode)
      .single();

    if (!template) {
      throw notFound('Contract template not found');
    }

    if (template.status !== 'published') {
      throw preconditionFailed('Template must be published before creating packages');
    }

    // Auto-increment version
    const { data: latestPackage } = await supabase
      .from('contract_packages')
      .select('version')
      .eq('legal_case_id', validated.legalCaseId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = latestPackage ? latestPackage.version + 1 : 1;

    // Check for concurrent version conflict
    const { data: conflictCheck } = await supabase
      .from('contract_packages')
      .select('id')
      .eq('legal_case_id', validated.legalCaseId)
      .eq('version', nextVersion)
      .single();

    if (conflictCheck) {
      throw conflict(`Version ${nextVersion} already exists for this case`);
    }

    // Validate source_revision_ids are approved if provided
    if (validated.sourceRevisionIds.length > 0) {
      const { data: revisions } = await supabase
        .from('legal_source_revisions')
        .select('id, status')
        .in('id', validated.sourceRevisionIds);

      if (!revisions || revisions.length !== validated.sourceRevisionIds.length) {
        throw preconditionFailed('One or more source revisions not found');
      }

      const unapproved = revisions.filter((r) => r.status !== 'approved');
      if (unapproved.length > 0) {
        throw preconditionFailed(
          `All source revisions must be approved before creating a package. Unapproved: ${unapproved.map((r) => r.id).join(', ')}`
        );
      }
    }

    // Create package
    const { data: pkg, error } = await supabase
      .from('contract_packages')
      .insert({
        legal_case_id: validated.legalCaseId,
        template_code: validated.templateCode,
        version: nextVersion,
        status: 'draft',
        content_snapshot: validated.contentSnapshot,
        source_revision_ids: validated.sourceRevisionIds,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create contract package', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'contract_package.created',
      entity_type: 'contract_package',
      entity_id: pkg.id,
      command_id: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        template_code: validated.templateCode,
        version: nextVersion,
        status: 'draft',
        source_revision_ids: validated.sourceRevisionIds,
      },
    });

    return pkg;
  }

  /**
   * Transition package status
   * Validates state machine transitions and prerequisite checks
   */
  async transitionPackage(
    input: TransitionContractPackageStatusInput,
    userId: string,
    commandId?: string
  ): Promise<ContractPackage> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = transitionContractPackageStatusSchema.parse(input);

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

    if (!membership) {
      throw forbidden('No active membership');
    }

    // Approve requires legal_reviewer or owner
    const permKey =
      validated.targetStatus === 'approved_for_internal_use' ||
      validated.targetStatus === 'published_for_consultation'
        ? 'approve_package'
        : 'manage_packages';

    if (!ROLE_PERMISSIONS[permKey][membership.role as UserRole]) {
      throw forbidden(`Insufficient permissions to transition package to ${validated.targetStatus}`);
    }

    // Get current package
    const { data: pkg } = await supabase
      .from('contract_packages')
      .select('*')
      .eq('id', validated.packageId)
      .eq('legal_case_id', validated.legalCaseId)
      .single();

    if (!pkg) {
      throw notFound('Contract package not found');
    }

    // Check state machine
    const allowedTransitions = PACKAGE_TRANSITIONS[pkg.status as ContractPackageStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(pkg.status, validated.targetStatus);
    }

    // Prerequisite: source revisions must be approved for under_review transition
    if (validated.targetStatus === 'under_review' && pkg.source_revision_ids.length > 0) {
      const { data: revisions } = await supabase
        .from('legal_source_revisions')
        .select('id, status')
        .in('id', pkg.source_revision_ids);

      if (revisions) {
        const unapproved = revisions.filter((r) => r.status !== 'approved');
        if (unapproved.length > 0) {
          throw preconditionFailed(
            `All source revisions must be approved before package enters review. Unapproved: ${unapproved.map((r) => r.id).join(', ')}`
          );
        }
      }
    }

    // Prerequisite: template must be published for published_for_consultation
    if (validated.targetStatus === 'published_for_consultation') {
      const { data: template } = await supabase
        .from('contract_templates')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('code', pkg.template_code)
        .single();

      if (!template || template.status !== 'published') {
        throw preconditionFailed('Template must be published before package can be published for consultation');
      }
    }

    // Transition status (append-only: UPDATE is not blocked by RLS for owner/legal_reviewer)
    const { data: updated, error } = await supabase
      .from('contract_packages')
      .update({ status: validated.targetStatus })
      .eq('id', validated.packageId)
      .eq('legal_case_id', validated.legalCaseId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update package status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'contract_package.status_changed',
      entity_type: 'contract_package',
      entity_id: validated.packageId,
      command_id: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        template_code: pkg.template_code,
        version: pkg.version,
        from_status: pkg.status,
        to_status: validated.targetStatus,
      },
    });

    return updated;
  }

  /**
   * Get package by ID
   */
  async getPackage(packageId: string, legalCaseId: string): Promise<ContractPackage> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contract_packages')
      .select('*')
      .eq('id', packageId)
      .eq('legal_case_id', legalCaseId)
      .single();

    if (error || !data) {
      throw notFound('Contract package not found');
    }

    return data;
  }

  /**
   * Get packages for a legal case
   */
  async getCasePackages(
    legalCaseId: string,
    options: {
      status?: ContractPackageStatus;
      templateCode?: string;
    } = {}
  ): Promise<ContractPackage[]> {
    const supabase = await createClient();

    let query = supabase
      .from('contract_packages')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .order('version', { ascending: true });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.templateCode) {
      query = query.eq('template_code', options.templateCode);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch contract packages', 500);
    }

    return data || [];
  }
}

export const contractPackageService = new ContractPackageService();
