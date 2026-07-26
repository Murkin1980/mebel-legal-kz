import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const statusLabel = {
  processing: 'Обрабатывается',
  completed: 'Завершён',
  failed: 'Ошибка',
};

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [{ data: batch }, { data: files }] = await Promise.all([
    supabase
      .from('organization_import_batches')
      .select('*')
      .eq('id', id)
      .eq('organization_id', membership.organization_id)
      .maybeSingle(),
    supabase
      .from('organization_import_files')
      .select(
        'id,archive_path,file_name,mime_type,size_bytes,document_type,order_id,order_document_id',
      )
      .eq('import_batch_id', id)
      .eq('organization_id', membership.organization_id)
      .order('archive_path'),
  ]);
  if (!batch) notFound();

  const warnings: unknown[] = Array.isArray(batch.warnings)
    ? batch.warnings
    : [];
  return (
    <section className="page-stack">
      <header className="workspace-heading">
        <div>
          <span className="app-kicker">Партия импорта</span>
          <h1>{batch.archive_name}</h1>
          <p>
            Создана{' '}
            {new Intl.DateTimeFormat('ru-KZ', {
              dateStyle: 'long',
              timeStyle: 'short',
            }).format(new Date(batch.created_at))}
          </p>
        </div>
        <Link className="secondary-action" href="/app/imports">
          К истории
        </Link>
      </header>

      <section className="workspace-card">
        <div className="preview-summary">
          <div>
            <b>{batch.orders_count}</b>
            <span>заказов</span>
          </div>
          <div>
            <b>{batch.documents_count}</b>
            <span>документов</span>
          </div>
          <div>
            <b className={`import-status ${batch.status}`}>
              {statusLabel[batch.status as keyof typeof statusLabel] ||
                batch.status}
            </b>
            <span>статус</span>
          </div>
        </div>
        {warnings.length > 0 && (
          <ul className="form-error">
            {warnings.map((warning) => (
              <li key={String(warning)}>{String(warning)}</li>
            ))}
          </ul>
        )}
        {batch.status === 'completed' && batch.storage_path && (
          <a
            className="primary-action"
            href={`/app/imports/${batch.id}/download`}
          >
            Скачать исходный ZIP
          </a>
        )}
      </section>

      <section className="workspace-card">
        <h2>Файлы партии</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Файл</th>
                <th>Тип</th>
                <th>Размер</th>
                <th>Заказ</th>
              </tr>
            </thead>
            <tbody>
              {(files || []).map((file) => (
                <tr key={file.id}>
                  <td>{file.archive_path}</td>
                  <td>
                    <span className={`doc-chip ${file.document_type}`}>
                      {file.document_type}
                    </span>
                  </td>
                  <td>{Math.ceil(Number(file.size_bytes) / 1024)} КБ</td>
                  <td>
                    {file.order_id ? (
                      <Link href={`/app/orders/${file.order_id}`}>
                        Открыть заказ
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
