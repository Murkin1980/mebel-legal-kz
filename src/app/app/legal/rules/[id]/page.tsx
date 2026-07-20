import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { ruleService } from '@/modules/rules/rule.service';
import { legalSourceService } from '@/modules/legal-sources/legal-source.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';
import { RuleDetail } from './rule-detail';

export const dynamic = 'force-dynamic';

export default async function RuleDetailPage({
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

  let rule;
  try {
    rule = await ruleService.getRule(id, org.id);
  } catch {
    notFound();
  }

  // Get source revision info
  let revision = null;
  let source = null;
  try {
    revision = await legalSourceService.getRevision(rule.source_revision_id);
    source = await legalSourceService.getSource(revision.source_id, org.id);
  } catch {
    // Source may have been removed or table doesn't exist yet
  }

  const canApprove = role ? ROLE_PERMISSIONS.approve_legal_rule[role as UserRole] : false;

  return (
    <RuleDetail
      rule={{
        id: rule.id,
        code: rule.code,
        title: rule.title,
        description: rule.description,
        status: rule.status,
        logic: rule.logic,
        created_at: rule.created_at,
      }}
      sourceRevision={revision ? {
        id: revision.id,
        revision_number: revision.revision_number,
        content_hash: revision.content_hash,
        source_title: source?.title || 'Неизвестный источник',
        source_id: source?.id || '',
      } : null}
      userRole={role || 'observer'}
      canApprove={canApprove}
    />
  );
}
