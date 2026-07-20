import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { templateService } from '@/modules/templates/template.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole, ContractTemplateStatus } from '@/modules/shared/types';
import { TemplatesList } from './templates-list';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; customer_type?: string; project_type?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  const params = await searchParams;
  let templates: Awaited<ReturnType<typeof templateService.getOrganizationTemplates>>;
  try {
    templates = await templateService.getOrganizationTemplates(org.id, {
      status: params.status as ContractTemplateStatus | undefined,
      customerType: params.customer_type as string | undefined,
      projectType: params.project_type as string | undefined,
    });
  } catch {
    templates = [];
  }

  const canManage = role ? ROLE_PERMISSIONS.manage_templates[role as UserRole] : false;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <TemplatesList
        templates={templates.map(t => ({
          id: t.id,
          code: t.code,
          title: t.title,
          customer_type: t.customer_type,
          project_type: t.project_type,
          status: t.status,
          created_at: t.created_at,
        }))}
        orgName={org.name}
        userRole={role || 'observer'}
        canManage={canManage}
      />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-48 mb-6" />
      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
      </div>
    </div>
  );
}
