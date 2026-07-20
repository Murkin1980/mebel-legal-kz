'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Package {
  id: string;
  legal_case_id: string;
  template_code: string;
  version: number;
  status: string;
  created_at: string;
}

interface PackagesListProps {
  packages: Package[];
  caseId: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  under_review: 'На проверке',
  approved_for_internal_use: 'Утверждён',
  published_for_consultation: 'Опубликован',
  retired: 'Выведен',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved_for_internal_use: 'bg-blue-100 text-blue-800',
  published_for_consultation: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

export function PackagesList({ packages, caseId }: PackagesListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = packages.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/app/cases/${caseId}`} className="text-sm text-blue-600 hover:underline">← К кейсу</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Пакеты договоров</h1>
        </div>
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
      </div>

      <div className="bg-white shadow rounded-lg">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Пакеты не найдены</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Версия</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Шаблон</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">v{p.version}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.template_code}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
