'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CaseStatus, CustomerType, ProjectType, UserRole } from '@/modules/shared/types';

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

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  individual: 'Физ. лицо',
  individual_entrepreneur: 'ИП',
  legal_entity: 'Юр. лицо',
};

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  manufacture_only: 'Производство',
  manufacture_delivery: 'Произв. + доставка',
  manufacture_delivery_installation: 'Полный цикл',
};

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  designer: 'Дизайнер',
  legal_reviewer: 'Юрист',
  observer: 'Наблюдатель',
};

interface Case {
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
}

interface CasesListProps {
  cases: Case[];
  orgName: string;
  userRole: UserRole;
  canCreate: boolean;
}

type SortField = 'case_number' | 'title' | 'status' | 'updated_at' | 'total_amount_tiyin';
type SortDirection = 'asc' | 'desc';

export function CasesList({ cases, orgName, userRole, canCreate }: CasesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [customerTypeFilter, setCustomerTypeFilter] = useState(searchParams.get('customerType') || '');
  const [projectTypeFilter, setProjectTypeFilter] = useState(searchParams.get('projectType') || '');
  const [sortField, setSortField] = useState<SortField>(
    (searchParams.get('sort') as SortField) || 'updated_at'
  );
  const [sortDir, setSortDir] = useState<SortDirection>(
    (searchParams.get('dir') as SortDirection) || 'desc'
  );

  const updateFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (customerTypeFilter) params.set('customerType', customerTypeFilter);
    if (projectTypeFilter) params.set('projectType', projectTypeFilter);
    if (sortField !== 'updated_at') params.set('sort', sortField);
    if (sortDir !== 'desc') params.set('dir', sortDir);
    startTransition(() => {
      router.push(`/app/cases?${params.toString()}`);
    });
  }, [search, statusFilter, customerTypeFilter, projectTypeFilter, sortField, sortDir, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setTimeout(updateFilters, 0);
  };

  const filteredCases = cases
    .filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !c.case_number.toLowerCase().includes(q) &&
          !c.title.toLowerCase().includes(q) &&
          !c.customer_display_name.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (statusFilter && c.status !== statusFilter) return false;
      if (customerTypeFilter && c.customer_type !== customerTypeFilter) return false;
      if (projectTypeFilter && c.project_type !== projectTypeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'case_number':
          cmp = a.case_number.localeCompare(b.case_number);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'updated_at':
          cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'total_amount_tiyin':
          cmp = (Number(a.total_amount_tiyin) || 0) - (Number(b.total_amount_tiyin) || 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const hasActiveFilters = search || statusFilter || customerTypeFilter || projectTypeFilter;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Юридические кейсы
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Организация: {orgName} • Роль: {ROLE_LABELS[userRole]}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/app/cases/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Создать кейс
          </Link>
        )}
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <form onSubmit={handleSearch} className="p-4 space-y-4">
          <div className="flex gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по номеру, названию или клиенту..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Поиск кейсов"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200"
            >
              Найти
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setTimeout(updateFilters, 0); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Фильтр по статусу"
            >
              <option value="">Все статусы</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={customerTypeFilter}
              onChange={(e) => { setCustomerTypeFilter(e.target.value); setTimeout(updateFilters, 0); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Фильтр по типу клиента"
            >
              <option value="">Все клиенты</option>
              {Object.entries(CUSTOMER_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={projectTypeFilter}
              onChange={(e) => { setProjectTypeFilter(e.target.value); setTimeout(updateFilters, 0); }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Фильтр по типу проекта"
            >
              <option value="">Все проекты</option>
              {Object.entries(PROJECT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setCustomerTypeFilter('');
                  setProjectTypeFilter('');
                  setTimeout(updateFilters, 0);
                }}
                className="px-3 py-2 text-red-600 text-sm hover:text-red-800"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </form>

        {isPending && (
          <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm border-t border-blue-100">
            Обновление...
          </div>
        )}
      </div>

      {filteredCases.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters ? 'Нет кейсов по заданным фильтрам' : 'Нет кейсов'}
          </h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters
              ? 'Попробуйте изменить параметры поиска или сбросить фильтры.'
              : 'Создайте первый кейс для начала работы.'}
          </p>
          {canCreate && !hasActiveFilters && (
            <Link
              href="/app/cases/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Создать кейс
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Найдено: {filteredCases.length} из {cases.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="grid">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('case_number')}
                      className="hover:text-gray-700 focus:outline-none focus:underline"
                      aria-label="Сортировать по номеру"
                    >
                      Номер <span className="ml-1 text-gray-400">{sortField === 'case_number' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('title')}
                      className="hover:text-gray-700 focus:outline-none focus:underline"
                      aria-label="Сортировать по названию"
                    >
                      Название <span className="ml-1 text-gray-400">{sortField === 'title' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип проекта
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('status')}
                      className="hover:text-gray-700 focus:outline-none focus:underline"
                      aria-label="Сортировать по статусу"
                    >
                      Статус <span className="ml-1 text-gray-400">{sortField === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('total_amount_tiyin')}
                      className="hover:text-gray-700 focus:outline-none focus:underline"
                      aria-label="Сортировать по сумме"
                    >
                      Сумма <span className="ml-1 text-gray-400">{sortField === 'total_amount_tiyin' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => toggleSort('updated_at')}
                      className="hover:text-gray-700 focus:outline-none focus:underline"
                      aria-label="Сортировать по дате обновления"
                    >
                      Обновлён <span className="ml-1 text-gray-400">{sortField === 'updated_at' ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCases.map((legalCase) => (
                  <tr key={legalCase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/app/cases/${legalCase.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        {legalCase.case_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-xs" title={legalCase.title}>
                        {legalCase.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="text-xs text-gray-400 mr-1">
                        {CUSTOMER_TYPE_LABELS[legalCase.customer_type as CustomerType]}
                      </span>
                      {legalCase.customer_display_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {PROJECT_TYPE_LABELS[legalCase.project_type as ProjectType]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[legalCase.status as CaseStatus]}`}
                      >
                        {STATUS_LABELS[legalCase.status as CaseStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {legalCase.total_amount_tiyin
                        ? `${(Number(legalCase.total_amount_tiyin) / 100).toLocaleString('ru-RU')} ₸`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(legalCase.updated_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
