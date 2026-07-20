'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { transitionContractPackage } from '../actions';

interface Package {
  id: string;
  legal_case_id: string;
  template_code: string;
  version: number;
  status: string;
  content_snapshot: Record<string, unknown>;
  source_revision_ids: string[];
  created_at: string;
  created_by: string;
}

interface PackageDetailProps {
  pkg: Package;
  canManage: boolean;
  canApprove: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  under_review: 'На проверке',
  approved_for_internal_use: 'Утверждён для внутреннего использования',
  published_for_consultation: 'Опубликован для консультации',
  retired: 'Выведен',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved_for_internal_use: 'bg-blue-100 text-blue-800',
  published_for_consultation: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['under_review', 'retired'],
  under_review: ['approved_for_internal_use', 'retired'],
  approved_for_internal_use: ['published_for_consultation', 'retired'],
  published_for_consultation: ['retired'],
  retired: [],
};

const TRANSITION_LABELS: Record<string, string> = {
  under_review: 'На проверку',
  approved_for_internal_use: 'Утвердить',
  published_for_consultation: 'Опубликовать для консультации',
  retired: 'Вывести из эксплуатации',
};

export function PackageDetail({ pkg, canManage, canApprove }: PackageDetailProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTransitions = ALLOWED_TRANSITIONS[pkg.status] || [];

  async function handleTransition(targetStatus: string) {
    setTransitioning(true);
    setError(null);

    try {
      const result = await transitionContractPackage({
        packageId: pkg.id,
        legalCaseId: pkg.legal_case_id,
        targetStatus,
      });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Ошибка при изменении статуса');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/app/cases/${pkg.legal_case_id}/packages`} className="text-sm text-blue-600 hover:underline">← Пакеты</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пакет v{pkg.version}</h1>
          <p className="text-sm text-gray-500 font-mono">{pkg.template_code}</p>
        </div>
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[pkg.status]}`}>
          {STATUS_LABELS[pkg.status]}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Информация</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Шаблон</dt>
              <dd className="text-sm text-gray-900 font-mono">{pkg.template_code}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Версия</dt>
              <dd className="text-sm text-gray-900">v{pkg.version}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Создан</dt>
              <dd className="text-sm text-gray-900">{new Date(pkg.created_at).toLocaleDateString('ru-RU')}</dd>
            </div>
            {pkg.source_revision_ids.length > 0 && (
              <div>
                <dt className="text-sm text-gray-500">Источники ({pkg.source_revision_ids.length})</dt>
                <dd className="text-sm text-gray-900">{pkg.source_revision_ids.length} ревизий</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Действия</h2>
          {allowedTransitions.length === 0 ? (
            <p className="text-sm text-gray-500">Нет доступных действий</p>
          ) : (
            <div className="space-y-2">
              {allowedTransitions.map(status => {
                const needsApprove = status === 'approved_for_internal_use' || status === 'published_for_consultation';
                const allowed = needsApprove ? canApprove : canManage;

                if (!allowed) return null;

                return (
                  <button
                    key={status}
                    onClick={() => handleTransition(status)}
                    disabled={transitioning}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium ${
                      status === 'retired'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    } disabled:opacity-50`}
                  >
                    {TRANSITION_LABELS[status]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Содержимое пакета (JSON)</h2>
        <pre className="bg-gray-50 rounded-md p-4 text-sm overflow-auto max-h-96">
          {JSON.stringify(pkg.content_snapshot, null, 2)}
        </pre>
      </div>
    </div>
  );
}
