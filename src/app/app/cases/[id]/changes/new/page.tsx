import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { NewChangeForm } from './new-change-form';

export default async function NewChangePage({
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
    .select('id, template_code, version, status')
    .eq('legal_case_id', id)
    .order('version', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Новое изменение заказа</h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>
      <NewChangeForm
        legalCaseId={id}
        packages={packages || []}
      />
    </div>
  );
}
