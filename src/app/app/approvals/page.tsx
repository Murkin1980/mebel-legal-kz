import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { ApprovalsList } from './approvals-list';

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-center py-12 text-gray-500">Необходима авторизация</div>;
  }

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) {
    return <div className="text-center py-12 text-gray-500">Нет доступных организаций</div>;
  }

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  const { data: approvals } = await supabase
    .from('contract_approvals')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });

  const { data: cases } = await supabase
    .from('legal_cases')
    .select('id, case_number, title')
    .eq('organization_id', org.id);

  const caseMap = new Map((cases || []).map((c: Record<string, unknown>) => [c.id, c]));

  return (
    <ApprovalsList
      approvals={(approvals || []) as Record<string, unknown>[]}
      caseMap={caseMap as unknown as Map<string, { case_number: string; title: string }>}
      userRole={role || 'observer'}
    />
  );
}
