import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { orderService } from '@/modules/orders/order.service';
import { DocumentProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function DocumentSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('organization_memberships')
    .select('organization_id').eq('user_id', user.id).eq('status', 'active').limit(1).single();
  if (!membership) redirect('/app');
  const profile = await orderService.getDocumentProfile(membership.organization_id as string);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-blue-700">Настройки документов</p>
      <h2 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">Реквизиты компании</h2>
      <p className="mt-2 text-sm text-gray-600">Данные фиксируются в снимке каждой новой версии счёта и акта. Изменение профиля не переписывает созданные документы.</p>
      <DocumentProfileForm profile={profile} />
    </div>
  );
}
