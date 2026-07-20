import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { NewClaimForm } from './new-claim-form';

export default async function NewClaimPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: legalCase } = await supabase
    .from('legal_cases')
    .select('id, case_number, title')
    .eq('id', id)
    .single();

  if (!legalCase) notFound();

  const { data: packages } = await supabase
    .from('contract_packages')
    .select('id, template_code, version')
    .eq('legal_case_id', id)
    .order('version', { ascending: false });

  const { data: changeOrders } = await supabase
    .from('change_orders')
    .select('id, number, status')
    .eq('legal_case_id', id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Новая претензия</h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>
      <NewClaimForm
        legalCaseId={id}
        packages={packages || []}
        changeOrders={changeOrders || []}
      />
    </div>
  );
}
