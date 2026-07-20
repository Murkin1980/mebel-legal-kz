'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Template {
  id: string;
  code: string;
  title: string;
  customer_type: string;
  project_type: string;
  status: string;
  created_at: string;
}

interface TemplatesListProps {
  templates: Template[];
  orgName: string;
  userRole: string;
  canManage: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  expert_review: 'Экспертиза',
  published: 'Опубликован',
  retired: 'Выведен',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  expert_review: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: 'Физ. лицо',
  legal_entity: 'Юр. лицо',
  government: 'Гос. орган',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  apartment: 'Квартира',
  house: 'Дом',
  commercial: 'Коммерческий',
  other: 'Другое',
};

export function TemplatesList({ templates, orgName, userRole, canManage }: TemplatesListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  const filtered = templates.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (customerFilter !== 'all' && t.customer_type !== customerFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Шаблоны договоров</h1>
          <p className="text-sm text-gray-500">{orgName} · {userRole}</p>
        </div>
        {canManage && (
          <Link
            href="/app/templates/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Новый шаблон
          </Link>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Все типы клиентов</option>
          {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow rounded-lg">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Шаблоны не найдены</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Клиент</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Проект</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{t.code}</td>
                  <td className="px-6 py-4">
                    <Link href={`/app/templates/${t.id}`} className="text-sm text-blue-600 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{CUSTOMER_TYPE_LABELS[t.customer_type] || t.customer_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{PROJECT_TYPE_LABELS[t.project_type] || t.project_type}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.created_at).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
