'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { changeOrderService } from '@/modules/change-orders/change-order.service';
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

export async function createChangeOrder(formData: {
  legalCaseId: string;
  contractPackageId: string;
  changeType: string;
  deltaAmount: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResponse<{ changeOrderId: string; number: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await changeOrderService.createChangeOrder(
      {
        legalCaseId: formData.legalCaseId,
        contractPackageId: formData.contractPackageId,
        changeType: formData.changeType as 'scope' | 'price' | 'deadline' | 'terms' | 'other',
        deltaAmount: formData.deltaAmount,
        reason: formData.reason,
        metadata: formData.metadata || {},
      },
      ctx.user.id
    );

    revalidatePath(`/app/cases/${formData.legalCaseId}/changes`);
    return { success: true, data: { changeOrderId: result.id, number: result.number } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionChangeOrder(formData: {
  changeOrderId: string;
  targetStatus: string;
  notes?: string;
}): Promise<ActionResponse<{ changeOrderId: string; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await changeOrderService.transitionChangeOrder(
      {
        changeOrderId: formData.changeOrderId,
        targetStatus: formData.targetStatus as
          | 'draft'
          | 'requested'
          | 'approved'
          | 'rejected'
          | 'applied'
          | 'cancelled',
        notes: formData.notes,
      },
      ctx.user.id
    );

    revalidatePath(`/app/cases/${result.legal_case_id}/changes`);
    revalidatePath(`/app/cases/${result.legal_case_id}/changes/${result.id}`);
    return { success: true, data: { changeOrderId: result.id, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
