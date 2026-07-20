import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { caseService } from '@/modules/cases/case.service';
import { CasesList } from './cases-list';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';

export const dynamic = 'force-dynamic';

export default async function CasesPage() {
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
  const cases = await caseService.getOrganizationCases(org.id);

  const canCreate = role ? ROLE_PERMISSIONS.create_case[role as UserRole] : false;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CasesList
        cases={cases as unknown as Array<{
          id: string;
          case_number: string;
          title: string;
          customer_type: string;
          customer_display_name: string;
          project_type: string;
          status: string;
          total_amount_tiyin: string | null;
          updated_at: string;
          created_at: string;
        }>}
        orgName={org.name}
        userRole={role || 'observer'}
        canCreate={canCreate}
      />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-48 mb-6" />
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="h-10 bg-gray-200 rounded" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
