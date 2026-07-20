'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveLegalSourceRevision } from '../../actions';
import type { LegalSourceStatus, LegalSourceRevisionStatus } from '@/modules/shared/types';

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

const REVISION_STATUS_LABELS: Record<LegalSourceRevisionStatus, string> = {
  draft: 'Черновик',
  under_review: 'На проверке',
  approved: 'Утверждена',
  retired: 'Устаревшая',
};

const REVISION_STATUS_COLORS: Record<LegalSourceRevisionStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

const SYSTEM_LABELS: Record<string, string> = {
  adilet: 'ИПС «Әділет»',
  internal: 'Внутренний',
  other: 'Другой',
};

interface Source {
  id: string;
  title: string;
  source_system: string;
  status: LegalSourceStatus;
  is_allowed: boolean;
  canonical_url: string;
  created_at: string;
}

interface Revision {
  id: string;
  revision_number: number;
  effective_from: string | null;
  effective_to: string | null;
  fetched_at: string;
  content_hash: string;
  status: LegalSourceRevisionStatus;
  metadata: Record<string, unknown>;
}

interface Props {
  source: Source;
  revisions: Revision[];
  userRole: string;
  canApprove: boolean;
}

export function SourceDetail({ source, revisions, canApprove }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove(revisionId: string) {
    startTransition(async () => {
      const result = await approveLegalSourceRevision({
        sourceId: source.id,
        revisionId,
        sourceStatus: 'approved',
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/legal/sources" className="text-blue-600 hover:underline text-sm">
          ← К списку источников
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{source.title}</h2>
            <p className="text-sm text-gray-500 mt-1">{SYSTEM_LABELS[source.source_system] || source.source_system}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[source.status]}`}>
            {STATUS_LABELS[source.status]}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">URL:</span>{' '}
            <span className="text-gray-900">{source.canonical_url}</span>
          </div>
          <div>
            <span className="text-gray-500">Allowlist:</span>{' '}
            {source.is_allowed ? (
              <span className="text-green-600 font-medium">Разрешён</span>
            ) : (
              <span className="text-gray-400">Не разрешён</span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Создан:</span>{' '}
            <span className="text-gray-900">{new Date(source.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Редакции</h3>
      </div>

      {revisions.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Нет редакций</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действует с</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действует до</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Хеш</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Получена</th>
                {canApprove && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {revisions.map(rev => (
                <tr key={rev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">v{rev.revision_number}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${REVISION_STATUS_COLORS[rev.status]}`}>
                      {REVISION_STATUS_LABELS[rev.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rev.effective_from || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{rev.effective_to || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono" title={rev.content_hash}>
                    {rev.content_hash.substring(0, 12)}…
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(rev.fetched_at).toLocaleDateString('ru-RU')}
                  </td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {(rev.status === 'under_review') && (
                        <button
                          onClick={() => handleApprove(rev.id)}
                          disabled={isPending}
                          className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                        >
                          {isPending ? '...' : 'Утвердить'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-800">
          Редакции неизменяемы после создания. Web scraping ИПС «Әділет» запрещён. Источники добавляются вручную.
        </p>
      </div>
    </div>
  );
}
