'use client';

import Link from 'next/link';
import type { ChangeOrder } from '@/modules/shared/types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  requested: 'На согласовании',
  approved: 'Утверждено',
  rejected: 'Отклонено',
  applied: 'Применено',
  cancelled: 'Отменено',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  requested: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  applied: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  scope: 'Объём',
  price: 'Стоимость',
  deadline: 'Сроки',
  terms: 'Условия',
  other: 'Другое',
};

function formatTiyin(amount: string): string {
  const num = parseInt(amount, 10);
  const absNum = Math.abs(num);
  const formatted = absNum.toLocaleString('ru-RU');
  return num >= 0 ? `+${formatted} ₸` : `-${formatted} ₸`;
}

export function ChangesList({
  legalCaseId,
  changes,
}: {
  legalCaseId: string;
  changes: ChangeOrder[];
}) {
  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {changes.length} изменений
        </p>
        <Link
          href={`/app/cases/${legalCaseId}/changes/new`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Создать изменение
        </Link>
      </div>

      {changes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">Изменений пока нет</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Номер</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Изменение суммы</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {changes.map((change) => (
                <tr key={change.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/app/cases/${legalCaseId}/changes/${change.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {change.number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {CHANGE_TYPE_LABELS[change.change_type] || change.change_type}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span className={change.delta_amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}>
                      {formatTiyin(change.delta_amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[change.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[change.status] || change.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(change.created_at).toLocaleDateString('ru-RU')}
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
