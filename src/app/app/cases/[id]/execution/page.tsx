import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ExecutionView } from './execution-view';
import type { ExecutionCheckpoint, ExecutionPaymentsSummary } from '@/modules/shared/types';

export default async function ExecutionPage({
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

  const { data: phases } = await supabase
    .from('contract_execution_phases')
    .select('*')
    .eq('legal_case_id', id)
    .order('created_at', { ascending: false });

  const checkpointsByPhase: Record<string, ExecutionCheckpoint[]> = {};
  if (phases && phases.length > 0) {
    const phaseIds = phases.map((p) => p.id);
    const { data: allCheckpoints } = await supabase
      .from('execution_checkpoints')
      .select('*')
      .in('execution_phase_id', phaseIds)
      .order('created_at', { ascending: true });

    if (allCheckpoints) {
      for (const cp of allCheckpoints) {
        if (!checkpointsByPhase[cp.execution_phase_id]) {
          checkpointsByPhase[cp.execution_phase_id] = [];
        }
        checkpointsByPhase[cp.execution_phase_id].push(cp as ExecutionCheckpoint);
      }
    }
  }

  const { data: summaries } = await supabase
    .from('execution_payments_summary')
    .select('*')
    .eq('legal_case_id', id)
    .order('created_at', { ascending: false });

  const currentUser = (await supabase.auth.getUser()).data.user;
  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('user_id', currentUser?.id || '')
    .eq('status', 'active')
    .limit(1)
    .single();

  const userRole = memberships?.role || 'observer';

  return (
    <ExecutionView
      legalCaseId={id}
      legalCase={legalCase}
      phases={phases || []}
      checkpointsByPhase={checkpointsByPhase}
      summaries={(summaries || []) as ExecutionPaymentsSummary[]}
      userRole={userRole}
    />
  );
}
