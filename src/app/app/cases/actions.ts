'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { caseService } from '@/modules/cases/case.service';
import { executionPhaseService } from '@/modules/execution/execution-phase.service';
import { checkpointService } from '@/modules/execution/checkpoint.service';
import { executionPaymentsSummaryService } from '@/modules/execution/payments-summary.service';
import { AppError } from '@/modules/shared/errors';
import type { CaseStatus, ExecutionPhaseName, CheckpointAssignedRole } from '@/modules/shared/types';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const organizations = await supabase
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!organizations.data) {
    return null;
  }

  return { user, org: { id: organizations.data.organization_id }, role: organizations.data.role as string };
}

function extractError(error: unknown): { error: string; errorCode: string } {
  if (error instanceof AppError) {
    return { error: error.message, errorCode: error.code };
  }
  if (error instanceof Error) {
    return { error: error.message, errorCode: 'INTERNAL_ERROR' };
  }
  return { error: 'An unknown error occurred', errorCode: 'INTERNAL_ERROR' };
}

export async function createCase(input: {
  caseNumber: string;
  title: string;
  customerType: string;
  customerDisplayName: string;
  projectType: string;
  totalAmount?: string;
}) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };
    }

    const totalAmountTiyin = input.totalAmount
      ? String(Math.round(parseFloat(input.totalAmount) * 100))
      : undefined;

    const result = await caseService.createCase(
      {
        caseNumber: input.caseNumber,
        title: input.title,
        customerType: input.customerType as 'individual' | 'individual_entrepreneur' | 'legal_entity',
        customerDisplayName: input.customerDisplayName,
        projectType: input.projectType as 'manufacture_only' | 'manufacture_delivery' | 'manufacture_delivery_installation',
        currency: 'KZT',
        totalAmountTiyin,
        sourceType: 'manual',
      },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath('/app/cases');
    return { success: true, data: { caseId: result.id } };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, errorCode: error.code };
    }
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionCaseStatus(input: {
  caseId: string;
  version: number;
  targetStatus: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
    }

    const organizations = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (!organizations.data) {
      return { success: false, error: 'No organization membership', errorCode: 'FORBIDDEN' };
    }

    const result = await caseService.transitionStatus(
      { caseId: input.caseId, version: input.version, targetStatus: input.targetStatus as CaseStatus },
      organizations.data.organization_id,
      user.id
    );

    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, ...extractError(error) };
  }
}

export async function transitionExecutionPhaseAction(input: {
  executionPhaseId: string;
  targetPhase: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await executionPhaseService.transitionExecutionPhase(
      { executionPhaseId: input.executionPhaseId, targetPhase: input.targetPhase as ExecutionPhaseName },
      user.id
    );

    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, ...extractError(error) };
  }
}

export async function createCheckpointAction(input: {
  executionPhaseId: string;
  name: string;
  description?: string;
  assignedRole?: string | null;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await checkpointService.createCheckpoint(
      {
        executionPhaseId: input.executionPhaseId,
        name: input.name,
        description: input.description,
        assignedRole: (input.assignedRole as CheckpointAssignedRole) || null,
        metadata: {},
      },
      user.id
    );

    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, ...extractError(error) };
  }
}

export async function completeCheckpointAction(input: { checkpointId: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await checkpointService.completeCheckpoint(
      { checkpointId: input.checkpointId },
      user.id
    );

    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, ...extractError(error) };
  }
}

export async function reopenCheckpointAction(input: { checkpointId: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await checkpointService.reopenCheckpoint(
      { checkpointId: input.checkpointId },
      user.id
    );

    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, ...extractError(error) };
  }
}

export async function updatePaymentSummaryAction(input: {
  legalCaseId: string;
  contractPackageId: string;
  amountDelta: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const result = await executionPaymentsSummaryService.updateSummary(
      {
        legalCaseId: input.legalCaseId,
        contractPackageId: input.contractPackageId,
        amountDelta: input.amountDelta,
      },
      user.id
    );

    return { success: true, data: result };
  } catch (error: unknown) {
    return { success: false, ...extractError(error) };
  }
}
