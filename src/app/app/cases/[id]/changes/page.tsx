import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChangesList } from './changes-list';

export default async function ChangesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: legalCase } = await supabase
    .from('legal_cases')
    .select('id, case_number, title, status')
    .eq('id', id)
    .single();

  if (!legalCase) notFound();

  const { data: changes } = await supabase
    .from('change_orders')
    .select('*')
    .eq('legal_case_id', id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Изменения заказа</h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>
      <ChangesList
        legalCaseId={id}
        changes={changes || []}
      />
    </div>
  );
}
