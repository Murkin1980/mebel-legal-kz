import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AdminClient } from './admin-client';
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('organization_memberships').select('organization_id,role')
    .eq('user_id',user.id).eq('status','active').limit(1).maybeSingle();
  if (membership && membership.role !== 'owner') redirect('/app/orders');
  let members: Array<{id:string;userId:string;email:string;role:string;status:string;createdAt:string}> = [];
  if (membership) {
    const admin = await createServiceClient();
    const { data: rows } = await admin.from('organization_memberships')
      .select('id,user_id,role,status,created_at').eq('organization_id',membership.organization_id)
      .order('created_at');
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const emailById = new Map(users.users.map((item) => [item.id, item.email || 'Email не указан']));
    members = (rows || []).map((item) => ({
      id:item.id,userId:item.user_id,email:emailById.get(item.user_id) || 'Email недоступен',
      role:item.role,status:item.status,createdAt:item.created_at,
    }));
  }
  return <section className="page-stack">
    <header className="workspace-heading"><div><span className="app-kicker">Администрирование</span><h1>Компания и доступы</h1><p>Изолированные рабочие области и одноразовые приглашения для команды.</p></div></header>
    <AdminClient organizationId={membership?.organization_id} members={members} />
  </section>;
}
