import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const organizations = await organizationService.getUserOrganizations(user.id);

  if (organizations.length === 0) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Нет доступных организаций
        </h2>
        <p className="mb-6 text-gray-600">
          Создайте организацию или попросите приглашение.
        </p>
        <Link
          href="/app/cases/new"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Создать организацию
        </Link>
      </div>
    );
  }

  // Orders are the primary workflow; legal cases remain a secondary module.
  if (organizations.length === 1) {
    redirect('/app/orders');
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">
        Ваши организации
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg font-medium text-gray-900">{org.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{org.slug}</p>
            <p className="text-sm text-gray-500">
              {org.country_code} • {org.default_currency}
            </p>
            <div className="mt-4">
              <Link
                href="/app/orders"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Перейти к заказам →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
