import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChangeDetail } from './change-detail';

export default async function ChangeDetailPage({
  params,
}: {
  params: Promise<{ id: string; changeId: string }>;
}) {
  const { id, changeId } = await params;
  const supabase = await createClient();

  const { data: legalCase } = await supabase
    .from('legal_cases')
    .select('id, case_number, title')
    .eq('id', id)
    .single();

  if (!legalCase) notFound();

  const { data: changeOrder } = await supabase
    .from('change_orders')
    .select('*')
    .eq('id', changeId)
    .eq('legal_case_id', id)
    .single();

  if (!changeOrder) notFound();

  const { data: auditEvents } = await supabase
    .from('audit_events')
    .select('*')
    .eq('entity_type', 'change_order')
    .eq('entity_id', changeId)
    .order('occurred_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Изменение {changeOrder.number}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>
      <ChangeDetail
        changeOrder={changeOrder}
        auditEvents={auditEvents || []}
      />
    </div>
  );
}
