import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { contractPackageService } from '@/modules/packages/contract-package.service';
import type { ContractPackageStatus } from '@/modules/shared/types';
import { PackagesList } from './packages-list';

export const dynamic = 'force-dynamic';

export default async function CasePackagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; template?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const { id } = await params;

  let packages: Awaited<ReturnType<typeof contractPackageService.getCasePackages>>;
  try {
    const sp = await searchParams;
    packages = await contractPackageService.getCasePackages(id, {
      status: sp.status as ContractPackageStatus | undefined,
      templateCode: sp.template as string | undefined,
    });
  } catch {
    packages = [];
  }

  return (
    <PackagesList
      packages={packages.map(p => ({
        id: p.id,
        legal_case_id: p.legal_case_id,
        template_code: p.template_code,
        version: p.version,
        status: p.status,
        created_at: p.created_at,
      }))}
      caseId={id}
    />
  );
}
