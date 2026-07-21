import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChecklistsView } from './checklists-view';
import type { ExecutionCheckpoint } from '@/modules/shared/types';

export default async function ChecklistsPage({
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
    .select('id, current_phase')
    .eq('legal_case_id', id)
    .order('created_at', { ascending: false });

  let allCheckpoints: ExecutionCheckpoint[] = [];
  if (phases && phases.length > 0) {
    const phaseIds = phases.map((p) => p.id);
    const { data: checkpoints } = await supabase
      .from('execution_checkpoints')
      .select('*')
      .in('execution_phase_id', phaseIds)
      .order('created_at', { ascending: true });

    if (checkpoints) allCheckpoints = checkpoints as ExecutionCheckpoint[];
  }

  const phaseMap: Record<string, string> = {};
  if (phases) {
    for (const p of phases) {
      phaseMap[p.id] = p.current_phase;
    }
  }

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
    <ChecklistsView
      legalCaseId={id}
      legalCase={legalCase}
      checkpoints={allCheckpoints}
      phaseMap={phaseMap}
      userRole={userRole}
    />
  );
}
