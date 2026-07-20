'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { legalSourceService } from '@/modules/legal-sources/legal-source.service';
import { ruleService } from '@/modules/rules/rule.service';
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

export async function createLegalSource(formData: {
  canonicalUrl: string;
  title: string;
  sourceSystem: string;
}): Promise<ActionResponse<{ sourceId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await legalSourceService.createSource(
      { canonicalUrl: formData.canonicalUrl, title: formData.title, sourceSystem: formData.sourceSystem as 'adilet' | 'internal' | 'other' },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath('/app/legal/sources');
    return { success: true, data: { sourceId: result.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function createLegalSourceRevision(formData: {
  sourceId: string;
  revisionNumber: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResponse<{ revisionId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await legalSourceService.createRevision(
      {
        sourceId: formData.sourceId,
        revisionNumber: formData.revisionNumber,
        effectiveFrom: formData.effectiveFrom || null,
        effectiveTo: formData.effectiveTo || null,
        contentHash: formData.contentHash,
        metadata: formData.metadata || {},
      },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath(`/app/legal/sources/${formData.sourceId}`);
    return { success: true, data: { revisionId: result.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function approveLegalSourceRevision(formData: {
  sourceId: string;
  revisionId: string;
  sourceStatus?: string;
}): Promise<ActionResponse<{ sourceId: string; revisionId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await legalSourceService.approveRevision(
      {
        sourceId: formData.sourceId,
        revisionId: formData.revisionId,
        sourceStatus: (formData.sourceStatus as 'draft' | 'approved' | 'deprecated') || 'approved',
      },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath(`/app/legal/sources/${formData.sourceId}`);
    revalidatePath('/app/legal/sources');
    return { success: true, data: { sourceId: result.source.id, revisionId: result.revision.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function createLegalRule(formData: {
  code: string;
  title: string;
  description: string;
  sourceRevisionId: string;
  logic?: Record<string, unknown>;
}): Promise<ActionResponse<{ ruleId: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await ruleService.createRule(
      {
        code: formData.code,
        title: formData.title,
        description: formData.description,
        sourceRevisionId: formData.sourceRevisionId,
        logic: formData.logic || {},
      },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath('/app/legal/rules');
    return { success: true, data: { ruleId: result.id } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}

export async function approveLegalRule(formData: {
  ruleId: string;
  targetStatus: string;
}): Promise<ActionResponse<{ ruleId: string; status: string }>> {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован', errorCode: 'UNAUTHORIZED' };

    const result = await ruleService.approveRule(
      { ruleId: formData.ruleId, targetStatus: formData.targetStatus as 'draft' | 'under_review' | 'approved' | 'retired' },
      ctx.org.id,
      ctx.user.id
    );

    revalidatePath('/app/legal/rules');
    revalidatePath(`/app/legal/rules/${formData.ruleId}`);
    return { success: true, data: { ruleId: result.id, status: result.status } };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message, errorCode: error.code };
    return { success: false, error: 'Внутренняя ошибка сервера', errorCode: 'INTERNAL_ERROR' };
  }
}
