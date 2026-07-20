'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contractApprovalService } from '@/modules/approvals/approval.service';
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

export async function createContractApproval(formData: {
  legalCaseId: string;
  contractPackageId: string;
  notes?: string;
}): Promise<ActionResponse<{ approvalId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await contractApprovalService.createApproval(
      {
        legalCaseId: formData.legalCaseId,
        contractPackageId: formData.contractPackageId,
        notes: formData.notes,
      },
      ctx.user.id
    );

    revalidatePath('/app/approvals');
    revalidatePath(`/app/cases/${formData.legalCaseId}/packages`);
    return { success: true, data: { approvalId: result.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionContractApproval(formData: {
  approvalId: string;
  targetStatus: string;
  notes?: string;
}): Promise<ActionResponse<{ approvalId: string; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await contractApprovalService.transitionApproval(
      {
        approvalId: formData.approvalId,
        targetStatus: formData.targetStatus as
          | 'draft'
          | 'pending_review'
          | 'approved'
          | 'rejected'
          | 'revoked',
        notes: formData.notes,
      },
      ctx.user.id
    );

    revalidatePath('/app/approvals');
    revalidatePath(`/app/approvals/${formData.approvalId}`);
    revalidatePath(`/app/cases/${result.legal_case_id}/packages`);
    return { success: true, data: { approvalId: result.id, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
