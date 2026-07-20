import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { ruleService } from '@/modules/rules/rule.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole, LegalRuleStatus } from '@/modules/shared/types';
import { LegalRulesList } from './legal-rules-list';

export const dynamic = 'force-dynamic';

export default async function LegalRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  const params = await searchParams;
  let rules: Awaited<ReturnType<typeof ruleService.getOrganizationRules>>;
  try {
    rules = await ruleService.getOrganizationRules(org.id, {
      status: params.status as LegalRuleStatus | undefined,
    });
  } catch {
    rules = [];
  }

  const canManage = role ? ROLE_PERMISSIONS.manage_legal_sources[role as UserRole] : false;
  const canApprove = role ? ROLE_PERMISSIONS.approve_legal_rule[role as UserRole] : false;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LegalRulesList
        rules={rules.map(r => ({
          id: r.id,
          code: r.code,
          title: r.title,
          description: r.description,
          status: r.status,
          source_revision_id: r.source_revision_id,
          created_at: r.created_at,
        }))}
        orgName={org.name}
        userRole={role || 'observer'}
        canManage={canManage}
        canApprove={canApprove}
      />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
      <div className="bg-white shadow rounded-lg p-4 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
      </div>
    </div>
  );
}
