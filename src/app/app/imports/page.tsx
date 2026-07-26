import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ImportClient, type ImportBatchSummary } from './import-client';

export default async function ImportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/login');

  const { data: batches } = await supabase
    .from('organization_import_batches')
    .select(
      'id,archive_name,status,orders_count,documents_count,warnings,created_at',
    )
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <section className="page-stack">
      <header className="workspace-heading">
        <div>
          <span className="app-kicker">Миграция данных</span>
          <h1>Импорт бухгалтерского архива</h1>
          <p>
            Сначала проверка структуры, затем явное подтверждение и запись с
            аудитом.
          </p>
        </div>
      </header>
      <ImportClient batches={(batches || []) as ImportBatchSummary[]} />
    </section>
  );
}
