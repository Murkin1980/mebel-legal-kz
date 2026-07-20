import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { notFound } from 'next/navigation';
import { ApprovalDetail } from './approval-detail';

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: approval } = await supabase
    .from('contract_approvals')
    .select('*')
    .eq('id', id)
    .single();

  if (!approval) {
    notFound();
  }

  const { data: legalCase } = await supabase
    .from('legal_cases')
    .select('id, case_number, title')
    .eq('id', approval.legal_case_id)
    .single();

  const { data: pkg } = await supabase
    .from('contract_packages')
    .select('id, version, template_code, status')
    .eq('id', approval.contract_package_id)
    .single();

  return (
    <ApprovalDetail
      approval={approval as Record<string, unknown>}
      legalCase={legalCase as Record<string, unknown> | null}
      pkg={pkg as Record<string, unknown> | null}
      userRole={role || 'observer'}
    />
  );
}
