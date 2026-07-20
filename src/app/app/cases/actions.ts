'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { caseService } from '@/modules/cases/case.service';
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
  if (!user) {
    return null;
  }

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return null;
  }

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  return { user, org, role };
}

export async function createCase(formData: {
  caseNumber: string;
  title: string;
  customerType: string;
  customerDisplayName: string;
  projectType: string;
  totalAmount?: string;
}): Promise<ActionResponse<{ caseId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };
    }

    const { user, org } = ctx;

    const totalAmountTiyin = formData.totalAmount
      ? String(Math.round(parseFloat(formData.totalAmount) * 100))
      : undefined;

    const result = await caseService.createCase(
      {
        caseNumber: formData.caseNumber,
        title: formData.title,
        customerType: formData.customerType as 'individual' | 'individual_entrepreneur' | 'legal_entity',
        customerDisplayName: formData.customerDisplayName,
        projectType: formData.projectType as 'manufacture_only' | 'manufacture_delivery' | 'manufacture_delivery_installation',
        currency: 'KZT',
        totalAmountTiyin,
        sourceType: 'manual',
      },
      org.id,
      user.id
    );

    revalidatePath('/app/cases');
    return { success: true, data: { caseId: result.id } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, errorCode: error.code };
    }
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function updateCase(formData: {
  caseId: string;
  version: number;
  title?: string;
  customerType?: string;
  customerDisplayName?: string;
  projectType?: string;
  totalAmount?: string;
}): Promise<ActionResponse<{ version: number }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };
    }

    const { user, org } = ctx;

    const totalAmountTiyin = formData.totalAmount !== undefined
      ? (formData.totalAmount ? String(Math.round(parseFloat(formData.totalAmount) * 100)) : null)
      : undefined;

    const result = await caseService.updateCaseBasics(
      {
        caseId: formData.caseId,
        version: formData.version,
        title: formData.title,
        customerType: formData.customerType as 'individual' | 'individual_entrepreneur' | 'legal_entity' | undefined,
        customerDisplayName: formData.customerDisplayName,
        projectType: formData.projectType as 'manufacture_only' | 'manufacture_delivery' | 'manufacture_delivery_installation' | undefined,
        totalAmountTiyin,
      },
      org.id,
      user.id
    );

    revalidatePath('/app/cases');
    revalidatePath(`/app/cases/${formData.caseId}`);
    return { success: true, data: { version: result.version } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, errorCode: error.code };
    }
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionCaseStatus(formData: {
  caseId: string;
  version: number;
  targetStatus: string;
}): Promise<ActionResponse<{ version: number; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) {
      return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };
    }

    const { user, org } = ctx;

    const result = await caseService.transitionStatus(
      {
        caseId: formData.caseId,
        version: formData.version,
        targetStatus: formData.targetStatus as 'draft' | 'data_collection' | 'ready_for_review' | 'approved' | 'suspended' | 'closed' | 'cancelled',
      },
      org.id,
      user.id
    );

    revalidatePath('/app/cases');
    revalidatePath(`/app/cases/${formData.caseId}`);
    return { success: true, data: { version: result.version, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message, errorCode: error.code };
    }
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
