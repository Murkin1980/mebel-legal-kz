import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ClaimDetail } from './claim-detail';

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string; claimId: string }>;
}) {
  const { id, claimId } = await params;
  const supabase = await createClient();

  const { data: legalCase } = await supabase
    .from('legal_cases')
    .select('id, case_number, title')
    .eq('id', id)
    .single();

  if (!legalCase) notFound();

  const { data: claim } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .eq('legal_case_id', id)
    .single();

  if (!claim) notFound();

  const { data: auditEvents } = await supabase
    .from('audit_events')
    .select('*')
    .eq('entity_type', 'claim')
    .eq('entity_id', claimId)
    .order('occurred_at', { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Претензия
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>
      <ClaimDetail
        claim={claim}
        auditEvents={auditEvents || []}
      />
    </div>
  );
}
