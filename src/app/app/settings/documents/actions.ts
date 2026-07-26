'use server';

import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { organizationDocumentProfileSchema } from '@/modules/orders/validation';

export async function saveDocumentProfileAction(
  _previous: { success?: boolean; error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Не авторизован' };
  const { data: membership } = await supabase.from('organization_memberships')
    .select('organization_id').eq('user_id', user.id).eq('status', 'active').limit(1).single();
  if (!membership) return { error: 'Организация не найдена' };

  const parsed = organizationDocumentProfileSchema.safeParse({
    legalName: String(formData.get('legalName') || ''), iinBin: String(formData.get('iinBin') || ''),
    address: String(formData.get('address') || ''), phone: String(formData.get('phone') || ''),
    email: String(formData.get('email') || ''), bankName: String(formData.get('bankName') || ''),
    iik: String(formData.get('iik') || ''), bik: String(formData.get('bik') || ''),
    kbe: String(formData.get('kbe') || ''), knp: String(formData.get('knp') || ''),
    signatoryName: String(formData.get('signatoryName') || ''),
  });
  if (!parsed.success) return { error: 'Проверьте обязательные поля и формат email' };
  const value = parsed.data;
  const { error } = await supabase.rpc('save_organization_document_profile_with_audit', {
    p_organization_id: membership.organization_id, p_actor_user_id: user.id, p_command_id: uuidv4(),
    p_profile: {
      legal_name: value.legalName, iin_bin: value.iinBin, address: value.address,
      phone: value.phone || null, email: value.email || null, bank_name: value.bankName || null,
      iik: value.iik || null, bik: value.bik || null, kbe: value.kbe || null,
      knp: value.knp || null, signatory_name: value.signatoryName || null,
    },
  });
  if (error) return { error: 'Не удалось сохранить реквизиты' };
  revalidatePath('/app/settings/documents');
  return { success: true };
}
