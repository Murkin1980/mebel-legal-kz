'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contractPackageService } from '@/modules/packages/contract-package.service';
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

export async function createContractPackage(formData: {
  legalCaseId: string;
  templateCode: string;
  contentSnapshot?: Record<string, unknown>;
  sourceRevisionIds?: string[];
}): Promise<ActionResponse<{ packageId: string; version: number }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await contractPackageService.createPackage(
      {
        legalCaseId: formData.legalCaseId,
        templateCode: formData.templateCode,
        contentSnapshot: formData.contentSnapshot || {},
        sourceRevisionIds: formData.sourceRevisionIds || [],
      },
      ctx.user.id
    );

    revalidatePath(`/app/cases/${formData.legalCaseId}/packages`);
    return { success: true, data: { packageId: result.id, version: result.version } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionContractPackage(formData: {
  packageId: string;
  legalCaseId: string;
  targetStatus: string;
}): Promise<ActionResponse<{ packageId: string; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await contractPackageService.transitionPackage(
      {
        packageId: formData.packageId,
        legalCaseId: formData.legalCaseId,
        targetStatus: formData.targetStatus as
          | 'draft'
          | 'under_review'
          | 'approved_for_internal_use'
          | 'published_for_consultation'
          | 'retired',
      },
      ctx.user.id
    );

    revalidatePath(`/app/cases/${formData.legalCaseId}/packages`);
    revalidatePath(`/app/cases/${formData.legalCaseId}/packages/${formData.packageId}`);
    return { success: true, data: { packageId: result.id, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
