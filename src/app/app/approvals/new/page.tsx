import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { NewApprovalForm } from './new-approval-form';

export default async function NewApprovalPage() {
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

  const canManage = role === 'owner' || role === 'manager';
  if (!canManage) {
    return <div className="text-center py-12 text-gray-500">Нет прав на создание согласований</div>;
  }

  const { data: cases } = await supabase
    .from('legal_cases')
    .select('id, case_number, title, status')
    .eq('organization_id', org.id)
    .neq('status', 'cancelled')
    .order('case_number', { ascending: true });

  const { data: packages } = await supabase
    .from('contract_packages')
    .select('id, legal_case_id, template_code, version, status')
    .in('legal_case_id', (cases || []).map((c: Record<string, unknown>) => c.id as string))
    .neq('status', 'retired')
    .order('version', { ascending: true });

  return (
    <NewApprovalForm
      cases={(cases || []) as Record<string, unknown>[]}
      packages={(packages || []) as Record<string, unknown>[]}
    />
  );
}
