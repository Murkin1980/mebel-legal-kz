import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { contractPackageService } from '@/modules/packages/contract-package.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';
import { PackageDetail } from './package-detail';

export const dynamic = 'force-dynamic';

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string; packageId: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);
  const { id, packageId } = await params;

  let pkg;
  try {
    pkg = await contractPackageService.getPackage(packageId, id);
  } catch {
    redirect(`/app/cases/${id}/packages`);
  }

  const canManage = role ? ROLE_PERMISSIONS.manage_packages[role as UserRole] : false;
  const canApprove = role ? ROLE_PERMISSIONS.approve_package[role as UserRole] : false;

  return (
    <PackageDetail
      pkg={{
        id: pkg.id,
        legal_case_id: pkg.legal_case_id,
        template_code: pkg.template_code,
        version: pkg.version,
        status: pkg.status,
        content_snapshot: pkg.content_snapshot,
        source_revision_ids: pkg.source_revision_ids,
        created_at: pkg.created_at,
        created_by: pkg.created_by,
      }}
      canManage={canManage}
      canApprove={canApprove}
    />
  );
}
