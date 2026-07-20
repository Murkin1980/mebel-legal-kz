'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LegalRuleStatus } from '@/modules/shared/types';

const STATUS_LABELS: Record<LegalRuleStatus, string> = {
  draft: 'Черновик',
  under_review: 'На проверке',
  approved: 'Утверждено',
  retired: 'Устаревшее',
};

const STATUS_COLORS: Record<LegalRuleStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

interface Rule {
  id: string;
  code: string;
  title: string;
  description: string;
  status: LegalRuleStatus;
  source_revision_id: string;
  created_at: string;
}

interface Props {
  rules: Rule[];
  orgName: string;
  userRole: string;
  canManage: boolean;
  canApprove: boolean;
}

export function LegalRulesList({ rules, orgName, canManage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get('status') || '';

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('status', value);
    else params.delete('status');
    router.push(`/app/legal/rules?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Правила проверки</h2>
          <p className="text-sm text-gray-500 mt-1">{orgName}</p>
        </div>
      </div>

      <div className="mb-4">
        <select
          aria-label="Фильтр по статусу"
          value={currentStatus}
          onChange={e => setFilter(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="under_review">На проверке</option>
          <option value="approved">Утверждено</option>
          <option value="retired">Устаревшее</option>
        </select>
      </div>

      {rules.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Нет правил проверки</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Код</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Редакция</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/legal/rules/${rule.id}`} className="text-blue-600 hover:underline font-mono text-sm font-medium">
                      {rule.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{rule.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rule.status]}`}>
                      {STATUS_LABELS[rule.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{rule.source_revision_id.substring(0, 8)}…</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(rule.created_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Правила создаются вручную и привязываются к редакциям источников. AI не участвует в создании или применении правил.
          </p>
        </div>
      )}
    </div>
  );
}
