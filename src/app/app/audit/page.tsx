import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { auditService } from '@/modules/audit/audit.service';
import { organizationService } from '@/modules/organizations/organization.service';
import { AuditLog } from './audit-log';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
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
  const events = await auditService.getOrganizationEvents(org.id, { limit: 100 });

  const canViewCases = role ? ROLE_PERMISSIONS.view_cases[role as UserRole] : false;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AuditLog
        events={events.map((e) => ({
          id: e.id,
          event_type: e.event_type,
          entity_type: e.entity_type,
          entity_id: e.entity_id,
          actor_user_id: e.actor_user_id,
          command_id: e.command_id,
          occurred_at: e.occurred_at,
          payload: e.payload,
        }))}
        orgName={org.name}
        canViewCases={canViewCases}
      />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded w-32" />
            <div className="h-10 bg-gray-200 rounded w-32" />
            <div className="h-10 bg-gray-200 rounded w-32" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
