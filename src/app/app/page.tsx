import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';

export default async function AppPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const organizations = await organizationService.getUserOrganizations(user.id);

  if (organizations.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Нет доступных организаций
        </h2>
        <p className="text-gray-600 mb-6">
          Создайте организацию или попросите приглашение.
        </p>
        <Link
          href="/app/cases/new"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Создать организацию
        </Link>
      </div>
    );
  }

  // If only one organization, redirect to cases
  if (organizations.length === 1) {
    redirect('/app/cases');
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Ваши организации
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{org.slug}</p>
            <p className="text-sm text-gray-500">
              {org.country_code} • {org.default_currency}
            </p>
            <div className="mt-4">
              <Link
                href="/app/cases"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Перейти к кейсам →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
