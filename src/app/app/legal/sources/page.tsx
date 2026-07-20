import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { legalSourceService } from '@/modules/legal-sources/legal-source.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole, LegalSourceStatus, SourceSystem } from '@/modules/shared/types';
import { LegalSourcesList } from './legal-sources-list';

export const dynamic = 'force-dynamic';

export default async function LegalSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; system?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  const params = await searchParams;
  let sources;
  try {
    sources = await legalSourceService.getOrganizationSources(org.id, {
      status: params.status as LegalSourceStatus | undefined,
      sourceSystem: params.system as SourceSystem | undefined,
    });
  } catch {
    sources = [];
  }

  const canManage = role ? ROLE_PERMISSIONS.manage_legal_sources[role as UserRole] : false;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LegalSourcesList
        sources={sources.map(s => ({
          id: s.id,
          title: s.title,
          source_system: s.source_system,
          status: s.status,
          is_allowed: s.is_allowed,
          canonical_url: s.canonical_url,
          created_at: s.created_at,
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
