import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { caseService } from '@/modules/cases/case.service';
import { organizationService } from '@/modules/organizations/organization.service';
import { CaseDetail } from './case-detail';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

async function getCaseData(id: string, orgId: string) {
  return caseService.getCase(id, orgId);
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const organizations = await organizationService.getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect('/app');
  }

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  const legalCase = await getCaseData(id, org.id);

  if (!legalCase) {
    redirect('/app/cases');
  }

  return (
    <CaseDetail
      caseData={{
        id: legalCase.id,
        case_number: legalCase.case_number,
        title: legalCase.title,
        customer_type: legalCase.customer_type,
        customer_display_name: legalCase.customer_display_name,
        project_type: legalCase.project_type,
        status: legalCase.status,
        currency: legalCase.currency,
        total_amount_tiyin: legalCase.total_amount_tiyin,
        source_type: legalCase.source_type,
        version: legalCase.version,
        created_at: legalCase.created_at,
        updated_at: legalCase.updated_at,
      }}
      userRole={role || 'observer'}
    />
  );
}
