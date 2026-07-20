import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { caseService } from '@/modules/cases/case.service';
import type { CaseStatus } from '@/modules/shared/types';

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Черновик',
  data_collection: 'Сбор данных',
  ready_for_review: 'На проверке',
  approved: 'Утверждён',
  suspended: 'Приостановлен',
  closed: 'Закрыт',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  data_collection: 'bg-blue-100 text-blue-800',
  ready_for_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  suspended: 'bg-orange-100 text-orange-800',
  closed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

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
  const cases = await caseService.getOrganizationCases(org.id);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Юридические кейсы
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Организация: {org.name}
          </p>
        </div>
        <Link
          href="/app/cases/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Создать кейс
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Нет кейсов</p>
            <Link
              href="/app/cases/new"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800"
            >
              Создать первый кейс
            </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Номер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Клиент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cases.map((legalCase) => (
                <tr key={legalCase.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`/app/cases/${legalCase.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {legalCase.case_number}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{legalCase.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{legalCase.customer_display_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[legalCase.status as CaseStatus]}`}
                    >
                      {STATUS_LABELS[legalCase.status as CaseStatus]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {legalCase.total_amount_tiyin
                      ? `${(Number(legalCase.total_amount_tiyin) / 100).toLocaleString('ru-RU')} ₸`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
