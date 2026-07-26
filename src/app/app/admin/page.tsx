import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminClient } from './admin-client';
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('organization_memberships').select('organization_id,role')
    .eq('user_id',user.id).eq('status','active').limit(1).maybeSingle();
  if (membership && membership.role !== 'owner') redirect('/app/orders');
  return <section className="page-stack">
    <header className="workspace-heading"><div><span className="app-kicker">Администрирование</span><h1>Компания и доступы</h1><p>Изолированные рабочие области и одноразовые приглашения для команды.</p></div></header>
    <AdminClient organizationId={membership?.organization_id} />
  </section>;
}
