'use client';

import Link from 'next/link';
import type { Claim } from '@/modules/shared/types';

const STATUS_LABELS: Record<string, string> = {
  open: 'Открыта',
  in_review: 'На рассмотрении',
  resolved: 'Решена',
  withdrawn: 'Отозвана',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_review: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

const TYPE_LABELS: Record<string, string> = {
  quality: 'Качество',
  deadline: 'Сроки',
  payment: 'Оплата',
  scope: 'Объём',
  other: 'Другое',
};

export function ClaimsList({
  legalCaseId,
  claims,
}: {
  legalCaseId: string;
  claims: Claim[];
}) {
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {claims.length} претензий
        </p>
        <Link
          href={`/app/cases/${legalCaseId}/claims/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Открыть претензию
        </Link>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">Претензий пока нет</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Решение</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/app/cases/${legalCaseId}/claims/${claim.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {TYPE_LABELS[claim.type] || claim.type}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[claim.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[claim.status] || claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(claim.opened_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {claim.resolution_summary ? (
                      <span className="line-clamp-1">{claim.resolution_summary}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
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
