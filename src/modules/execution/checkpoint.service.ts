import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
} from '@/modules/shared/errors';
import type {
  ExecutionCheckpoint,
  CheckpointStatus,
  UserRole,
} from '@/modules/shared/types';
import { CHECKPOINT_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createCheckpointSchema,
  completeCheckpointSchema,
  reopenCheckpointSchema,
  type CreateCheckpointInput,
  type CompleteCheckpointInput,
  type ReopenCheckpointInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class CheckpointService {
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

  private async getOrgIdFromCheckpoint(
    supabase: SupabaseClient,
    checkpointId: string
  ): Promise<string> {
    const { data: checkpoint } = await supabase
      .from('execution_checkpoints')
      .select('organization_id')
      .eq('id', checkpointId)
      .single();

    if (!checkpoint) {
      throw notFound('Checkpoint not found');
    }

    return checkpoint.organization_id;
  }

  async createCheckpoint(
    input: CreateCheckpointInput,
    userId: string,
    commandId?: string
  ): Promise<ExecutionCheckpoint> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createCheckpointSchema.parse(input);

    const organizationId = await this.getOrgIdFromPhase(supabase, validated.executionPhaseId);

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_checkpoints[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create checkpoints');
    }

    const { data: checkpoint, error } = await supabase
      .from('execution_checkpoints')
      .insert({
        organization_id: organizationId,
        execution_phase_id: validated.executionPhaseId,
        name: validated.name,
        description: validated.description || null,
        status: 'pending',
        assigned_role: validated.assignedRole || null,
        created_by: userId,
        updated_by: userId,
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create checkpoint', 500);
    }

    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'checkpoint.created',
      entity_type: 'execution_checkpoint',
      entity_id: checkpoint.id,
      command_id: cmdId,
      payload: {
        execution_phase_id: validated.executionPhaseId,
        name: validated.name,
        assigned_role: validated.assignedRole,
      },
    });

    return checkpoint;
  }

  async completeCheckpoint(
    input: CompleteCheckpointInput,
    userId: string,
    commandId?: string
  ): Promise<ExecutionCheckpoint> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = completeCheckpointSchema.parse(input);

    const { data: checkpoint } = await supabase
      .from('execution_checkpoints')
      .select('*')
      .eq('id', validated.checkpointId)
      .single();

    if (!checkpoint) {
      throw notFound('Checkpoint not found');
    }

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', checkpoint.organization_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_checkpoints[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to complete checkpoints');
    }

    const allowedTransitions = CHECKPOINT_TRANSITIONS[checkpoint.status as CheckpointStatus];

    if (!allowedTransitions.includes('completed')) {
      throw invalidStateTransition(checkpoint.status, 'completed');
    }

    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (validated.metadata) {
      updatePayload.metadata = { ...checkpoint.metadata, ...validated.metadata };
    }

    const { data: updated, error } = await supabase
      .from('execution_checkpoints')
      .update(updatePayload)
      .eq('id', validated.checkpointId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to complete checkpoint', 500);
    }

    await supabase.from('audit_events').insert({
      organization_id: checkpoint.organization_id,
      actor_user_id: userId,
      event_type: 'checkpoint.completed',
      entity_type: 'execution_checkpoint',
      entity_id: validated.checkpointId,
      command_id: cmdId,
      payload: {
        execution_phase_id: checkpoint.execution_phase_id,
        name: checkpoint.name,
      },
    });

    return updated;
  }

  async reopenCheckpoint(
    input: ReopenCheckpointInput,
    userId: string,
    commandId?: string
  ): Promise<ExecutionCheckpoint> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = reopenCheckpointSchema.parse(input);

    const { data: checkpoint } = await supabase
      .from('execution_checkpoints')
      .select('*')
      .eq('id', validated.checkpointId)
      .single();

    if (!checkpoint) {
      throw notFound('Checkpoint not found');
    }

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', checkpoint.organization_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_checkpoints[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to reopen checkpoints');
    }

    const allowedTransitions = CHECKPOINT_TRANSITIONS[checkpoint.status as CheckpointStatus];

    if (!allowedTransitions.includes('reopened')) {
      throw invalidStateTransition(checkpoint.status, 'reopened');
    }

    const updatePayload: Record<string, unknown> = {
      status: 'reopened',
      completed_at: null,
      completed_by: null,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (validated.metadata) {
      updatePayload.metadata = { ...checkpoint.metadata, ...validated.metadata };
    }

    const { data: updated, error } = await supabase
      .from('execution_checkpoints')
      .update(updatePayload)
      .eq('id', validated.checkpointId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to reopen checkpoint', 500);
    }

    await supabase.from('audit_events').insert({
      organization_id: checkpoint.organization_id,
      actor_user_id: userId,
      event_type: 'checkpoint.reopened',
      entity_type: 'execution_checkpoint',
      entity_id: validated.checkpointId,
      command_id: cmdId,
      payload: {
        execution_phase_id: checkpoint.execution_phase_id,
        name: checkpoint.name,
      },
    });

    return updated;
  }

  async listCheckpointsByExecution(executionPhaseId: string): Promise<ExecutionCheckpoint[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('execution_checkpoints')
      .select('*')
      .eq('execution_phase_id', executionPhaseId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch checkpoints', 500);
    }

    return data || [];
  }
}

export const checkpointService = new CheckpointService();
