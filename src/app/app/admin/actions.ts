'use server';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import type { UserRole } from '@/modules/shared/types';

export async function createOrganizationAction(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };
  try {
    await organizationService.createOrganization({
      name: String(formData.get('name') || ''), slug: String(formData.get('slug') || ''),
      countryCode: 'KZ', defaultCurrency: 'KZT',
    }, user.id);
    revalidatePath('/app'); return { success: true };
  } catch { return { error: 'Не удалось создать компанию. Проверьте название и уникальный код.' }; }
}

export async function inviteMemberAction(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };
  const organizationId = String(formData.get('organizationId') || '');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = String(formData.get('role') || 'observer') as UserRole;
  const allowed: UserRole[] = ['manager','designer','legal_reviewer','observer'];
  if (!allowed.includes(role) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Проверьте email и роль' };
  const { data: owner } = await supabase.from('organization_memberships').select('id')
    .eq('organization_id', organizationId).eq('user_id', user.id).eq('role','owner').eq('status','active').maybeSingle();
  if (!owner) return { error: 'Только владелец может приглашать участников' };
  try {
    const admin = await createServiceClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/accept-invite`;
    const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo } });
    if (error || !data.user) throw error || new Error('No user');
    const { error: membershipError } = await admin.from('organization_memberships').upsert({
      organization_id: organizationId, user_id: data.user.id, role, status: 'invited',
    }, { onConflict: 'organization_id,user_id' });
    if (membershipError) throw membershipError;
    await admin.from('audit_events').insert({
      organization_id: organizationId, actor_user_id: user.id, event_type: 'member.invited',
      entity_type: 'organization_membership', entity_id: data.user.id,
      command_id: crypto.randomUUID(), payload: { role, email_domain: email.split('@')[1] || '' },
    });
    revalidatePath('/app/admin');
    return { success: true, invitationLink: data.properties.action_link };
  } catch { return { error: 'Не удалось создать приглашение' }; }
}

export async function manageMemberAction(_: unknown, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };
  const organizationId = String(formData.get('organizationId') || '');
  const membershipId = String(formData.get('membershipId') || '');
  const action = String(formData.get('action') || '');
  const role = String(formData.get('role') || '') as UserRole;
  if (!organizationId || !membershipId || !['change_role','disable','restore'].includes(action)) {
    return { error: 'Некорректная команда' };
  }
  const { error } = await supabase.rpc('manage_organization_member', {
    p_organization_id: organizationId,
    p_membership_id: membershipId,
    p_action: action,
    p_role: action === 'change_role' ? role : null,
    p_command_id: crypto.randomUUID(),
  });
  if (error) {
    const message = error.message.includes('last_owner')
      ? 'Нельзя изменить роль или отключить последнего активного владельца'
      : error.message.includes('owner_required')
        ? 'Только владелец может управлять командой'
        : 'Не удалось изменить участника';
    return { error: message };
  }
  revalidatePath('/app/admin');
  return { success: true };
}
