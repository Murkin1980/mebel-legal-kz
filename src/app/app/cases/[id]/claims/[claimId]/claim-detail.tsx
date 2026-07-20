'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Claim, AuditEvent } from '@/modules/shared/types';
import { CLAIM_TRANSITIONS } from '@/modules/shared/types';
import { transitionClaim } from '../actions';

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

export function ClaimDetail({
  claim,
  auditEvents,
}: {
  claim: Claim;
  auditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState('');

  const allowedTransitions = CLAIM_TRANSITIONS[claim.status as keyof typeof CLAIM_TRANSITIONS] || [];

  const TRANSITION_LABELS: Record<string, string> = {
    in_review: 'Взять на рассмотрение',
    resolved: 'Решить',
    withdrawn: 'Отозвать',
  };

  async function handleTransition(targetStatus: string) {
    setLoading(true);
    setError(null);

    const result = await transitionClaim({
      claimId: claim.id,
      targetStatus,
      resolutionSummary: targetStatus === 'resolved' ? resolutionSummary : undefined,
    });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || 'Ошибка перехода');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Детали претензии</h3>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[claim.status] || 'bg-gray-100 text-gray-800'}`}>
            {STATUS_LABELS[claim.status] || claim.status}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Тип</dt>
            <dd className="text-sm font-medium text-gray-900">
              {TYPE_LABELS[claim.type] || claim.type}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Открыта</dt>
            <dd className="text-sm text-gray-900">
              {new Date(claim.opened_at).toLocaleString('ru-RU')}
            </dd>
          </div>
          {claim.resolved_at && (
            <div>
              <dt className="text-sm text-gray-500">Решена</dt>
              <dd className="text-sm text-gray-900">
                {new Date(claim.resolved_at).toLocaleString('ru-RU')}
              </dd>
            </div>
          )}
          {claim.resolution_summary && (
            <div className="col-span-2">
              <dt className="text-sm text-gray-500">Решение</dt>
              <dd className="text-sm text-gray-900">{claim.resolution_summary}</dd>
            </div>
          )}
        </dl>
      </div>

      {allowedTransitions.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Действия</h3>

          {allowedTransitions.includes('resolved') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Решение (обязательно для &quot;Решить&quot;)
              </label>
              <textarea
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Опишите решение претензии..."
              />
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleTransition(status)}
                disabled={loading || (status === 'resolved' && !resolutionSummary.trim())}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {TRANSITION_LABELS[status] || status}
              </button>
            ))}
          </div>
        </div>
      )}

      {auditEvents.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">История событий</h3>
          <div className="space-y-3">
            {auditEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 whitespace-nowrap">
                  {new Date(event.occurred_at).toLocaleString('ru-RU')}
                </span>
                <span className="text-gray-700">{event.event_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
