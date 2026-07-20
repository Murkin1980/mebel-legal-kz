'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { templateService } from '@/modules/templates/template.service';
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

export async function createContractTemplate(formData: {
  code: string;
  title: string;
  customerType: string;
  projectType: string;
  schema?: Record<string, unknown>;
}): Promise<ActionResponse<{ templateId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await templateService.createTemplate(
      {
        code: formData.code,
        title: formData.title,
        customerType: formData.customerType as 'individual' | 'individual_entrepreneur' | 'legal_entity',
        projectType: formData.projectType as 'manufacture_only' | 'manufacture_delivery' | 'manufacture_delivery_installation',
        schema: formData.schema || {},
      },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath('/app/templates');
    return { success: true, data: { templateId: result.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function transitionContractTemplate(formData: {
  templateId: string;
  targetStatus: string;
}): Promise<ActionResponse<{ templateId: string; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await templateService.transitionTemplate(
      {
        templateId: formData.templateId,
        targetStatus: formData.targetStatus as 'draft' | 'expert_review' | 'published' | 'retired',
      },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath('/app/templates');
    revalidatePath(`/app/templates/${formData.templateId}`);
    return { success: true, data: { templateId: result.id, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
