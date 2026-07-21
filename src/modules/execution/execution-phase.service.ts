import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
  conflict,
} from '@/modules/shared/errors';
import type {
  ContractExecutionPhase,
  ExecutionPhaseName,
  UserRole,
} from '@/modules/shared/types';
import { EXECUTION_PHASE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createExecutionPhaseSchema,
  transitionExecutionPhaseSchema,
  type CreateExecutionPhaseInput,
  type TransitionExecutionPhaseInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class ExecutionPhaseService {
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

  private async getOrgIdFromPhase(
    supabase: SupabaseClient,
    executionPhaseId: string
  ): Promise<string> {
    const { data: phase } = await supabase
      .from('contract_execution_phases')
      .select('organization_id')
      .eq('id', executionPhaseId)
      .single();

    if (!phase) {
      throw notFound('Execution phase not found');
    }

    return phase.organization_id;
  }

  async createExecutionPhase(
    input: CreateExecutionPhaseInput,
    userId: string,
    commandId?: string
  ): Promise<ContractExecutionPhase> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createExecutionPhaseSchema.parse(input);

    const organizationId = await this.getOrgIdFromCase(supabase, validated.legalCaseId);

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_execution_phase[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create execution phase');
    }

    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('status')
      .eq('id', validated.legalCaseId)
      .single();

    if (!legalCase || legalCase.status === 'cancelled') {
      throw forbidden('Cannot create execution phase for cancelled case');
    }

    const { data: pkg } = await supabase
      .from('contract_packages')
      .select('id')
      .eq('id', validated.contractPackageId)
      .eq('legal_case_id', validated.legalCaseId)
      .single();

    if (!pkg) {
      throw notFound('Contract package not found');
    }

    const { data: existing } = await supabase
      .from('contract_execution_phases')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('legal_case_id', validated.legalCaseId)
      .eq('contract_package_id', validated.contractPackageId)
      .single();

    if (existing) {
      throw conflict('Execution phase already exists for this case and package');
    }

    const { data: phase, error } = await supabase
      .from('contract_execution_phases')
      .insert({
        organization_id: organizationId,
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        current_phase: 'drafting',
        status: 'active',
        created_by: userId,
        updated_by: userId,
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create execution phase', 500);
    }

    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'execution_phase.created',
      entity_type: 'contract_execution_phase',
      entity_id: phase.id,
      command_id: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        current_phase: 'drafting',
      },
    });

    return phase;
  }

  async transitionExecutionPhase(
    input: TransitionExecutionPhaseInput,
    userId: string,
    commandId?: string
  ): Promise<ContractExecutionPhase> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = transitionExecutionPhaseSchema.parse(input);

    const { data: phase } = await supabase
      .from('contract_execution_phases')
      .select('*')
      .eq('id', validated.executionPhaseId)
      .single();

    if (!phase) {
      throw notFound('Execution phase not found');
    }

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', phase.organization_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('No active membership');
    }

    const role = membership.role as UserRole;

    if (!ROLE_PERMISSIONS.manage_execution_phase[role]) {
      throw forbidden('Insufficient permissions to transition execution phase');
    }

    const allowedTransitions =
      EXECUTION_PHASE_TRANSITIONS[phase.current_phase as ExecutionPhaseName];

    if (!allowedTransitions.includes(validated.targetPhase)) {
      throw invalidStateTransition(phase.current_phase, validated.targetPhase);
    }

    const updatePayload: Record<string, unknown> = {
      current_phase: validated.targetPhase,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (validated.targetPhase === 'archived') {
      updatePayload.status = 'closed';
    }

    if (validated.metadata) {
      updatePayload.metadata = { ...phase.metadata, ...validated.metadata };
    }

    const { data: updated, error } = await supabase
      .from('contract_execution_phases')
      .update(updatePayload)
      .eq('id', validated.executionPhaseId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update execution phase', 500);
    }

    await supabase.from('audit_events').insert({
      organization_id: phase.organization_id,
      actor_user_id: userId,
      event_type: 'execution_phase.transitioned',
      entity_type: 'contract_execution_phase',
      entity_id: validated.executionPhaseId,
      command_id: cmdId,
      payload: {
        legal_case_id: phase.legal_case_id,
        contract_package_id: phase.contract_package_id,
        from_phase: phase.current_phase,
        to_phase: validated.targetPhase,
      },
    });

    return updated;
  }

  async getExecutionPhase(executionPhaseId: string): Promise<ContractExecutionPhase> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contract_execution_phases')
      .select('*')
      .eq('id', executionPhaseId)
      .single();

    if (error || !data) {
      throw notFound('Execution phase not found');
    }

    return data;
  }

  async getCaseExecutionPhases(legalCaseId: string): Promise<ContractExecutionPhase[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contract_execution_phases')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch execution phases', 500);
    }

    return data || [];
  }
}

export const executionPhaseService = new ExecutionPhaseService();
