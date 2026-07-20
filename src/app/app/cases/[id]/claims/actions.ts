'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { claimService } from '@/modules/claims/claim.service';
import { organizationService } from '@/modules/organizations/organization.service';
import { AppError } from '@/modules/shared/errors';

export interface ActionResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) return null;

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);
  return { user, org, role };
}

export async function createClaim(formData: {
  legalCaseId: string;
  contractPackageId?: string | null;
  changeOrderId?: string | null;
  type: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResponse<{ claimId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await claimService.createClaim(
      {
        legalCaseId: formData.legalCaseId,
        contractPackageId: formData.contractPackageId || null,
        changeOrderId: formData.changeOrderId || null,
        type: formData.type as 'quality' | 'deadline' | 'payment' | 'scope' | 'other',
        metadata: formData.metadata || {},
      },
      ctx.user.id
    );

    revalidatePath(`/app/cases/${formData.legalCaseId}/claims`);
    return { success: true, data: { claimId: result.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionClaim(formData: {
  claimId: string;
  targetStatus: string;
  resolutionSummary?: string;
  resolutionRuleIds?: string[];
  metadata?: Record<string, unknown>;
}): Promise<ActionResponse<{ claimId: string; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await claimService.transitionClaim(
      {
        claimId: formData.claimId,
        targetStatus: formData.targetStatus as
          | 'open'
          | 'in_review'
          | 'resolved'
          | 'withdrawn',
        resolutionSummary: formData.resolutionSummary,
        resolutionRuleIds: formData.resolutionRuleIds,
        metadata: formData.metadata,
      },
      ctx.user.id
    );

    revalidatePath(`/app/cases/${result.legal_case_id}/claims`);
    revalidatePath(`/app/cases/${result.legal_case_id}/claims/${result.id}`);
    return { success: true, data: { claimId: result.id, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
