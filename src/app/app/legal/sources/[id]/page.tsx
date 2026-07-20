import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { legalSourceService } from '@/modules/legal-sources/legal-source.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';
import { SourceDetail } from './source-detail';

export const dynamic = 'force-dynamic';

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);
  const { id } = await params;

  let source;
  try {
    source = await legalSourceService.getSource(id, org.id);
  } catch {
    notFound();
  }

  let revisions: Awaited<ReturnType<typeof legalSourceService.getSourceRevisions>>;
  try {
    revisions = await legalSourceService.getSourceRevisions(source.id);
  } catch {
    revisions = [];
  }
  const canApprove = role ? ROLE_PERMISSIONS.approve_legal_source_revision[role as UserRole] : false;

  return (
    <SourceDetail
      source={{
        id: source.id,
        title: source.title,
        source_system: source.source_system,
        status: source.status,
        is_allowed: source.is_allowed,
        canonical_url: source.canonical_url,
        created_at: source.created_at,
      }}
      revisions={revisions.map(r => ({
        id: r.id,
        revision_number: r.revision_number,
        effective_from: r.effective_from,
        effective_to: r.effective_to,
        fetched_at: r.fetched_at,
        content_hash: r.content_hash,
        status: r.status,
        metadata: r.metadata,
      }))}
      userRole={role || 'observer'}
      canApprove={canApprove}
    />
  );
}
