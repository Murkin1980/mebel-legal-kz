'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { LegalSourceStatus, SourceSystem } from '@/modules/shared/types';

const STATUS_LABELS: Record<LegalSourceStatus, string> = {
  draft: 'Черновик',
  approved: 'Утверждён',
  deprecated: 'Устаревший',
};

const STATUS_COLORS: Record<LegalSourceStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-red-100 text-red-800',
};

const SYSTEM_LABELS: Record<SourceSystem, string> = {
  adilet: 'ИПС «Әділет»',
  internal: 'Внутренний',
  other: 'Другой',
};

interface Source {
  id: string;
  title: string;
  source_system: SourceSystem;
  status: LegalSourceStatus;
  is_allowed: boolean;
  canonical_url: string;
  created_at: string;
}

interface Props {
  sources: Source[];
  orgName: string;
  userRole: string;
  canManage: boolean;
}

export function LegalSourcesList({ sources, orgName, canManage }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentSystem = searchParams.get('system') || '';

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/app/legal/sources?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Правовые источники</h2>
          <p className="text-sm text-gray-500 mt-1">{orgName}</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        <select
          aria-label="Фильтр по статусу"
          value={currentStatus}
          onChange={e => setFilter('status', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="approved">Утверждён</option>
          <option value="deprecated">Устаревший</option>
        </select>
        <select
          aria-label="Фильтр по системе"
          value={currentSystem}
          onChange={e => setFilter('system', e.target.value)}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">Все системы</option>
          <option value="adilet">ИПС «Әділет»</option>
          <option value="internal">Внутренний</option>
          <option value="other">Другой</option>
        </select>
      </div>

      {sources.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Нет правовых источников</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Система</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowlist</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Создан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sources.map(source => (
                <tr key={source.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/legal/sources/${source.id}`} className="text-blue-600 hover:underline font-medium">
                      {source.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{SYSTEM_LABELS[source.source_system]}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[source.status]}`}>
                      {STATUS_LABELS[source.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {source.is_allowed ? (
                      <span className="text-green-600 font-medium">Разрешён</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={source.canonical_url}>
                    {source.canonical_url}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(source.created_at).toLocaleDateString('ru-RU')}
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
            Источники добавляются вручную через seed миграции. Web scraping ИПС «Әділет» запрещён.
          </p>
        </div>
      )}
    </div>
  );
}
