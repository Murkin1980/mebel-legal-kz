'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChangeOrder, AuditEvent } from '@/modules/shared/types';
import { CHANGE_ORDER_TRANSITIONS } from '@/modules/shared/types';
import { transitionChangeOrder } from '../actions';

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

export function ChangeDetail({
  changeOrder,
  auditEvents,
}: {
  changeOrder: ChangeOrder;
  auditEvents: AuditEvent[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTransitions = CHANGE_ORDER_TRANSITIONS[changeOrder.status as keyof typeof CHANGE_ORDER_TRANSITIONS] || [];

  const TRANSITION_LABELS: Record<string, string> = {
    requested: 'Отправить на согласование',
    approved: 'Утвердить',
    rejected: 'Отклонить',
    applied: 'Применить',
    cancelled: 'Отменить',
  };

  async function handleTransition(targetStatus: string) {
    setLoading(true);
    setError(null);

    const result = await transitionChangeOrder({
      changeOrderId: changeOrder.id,
      targetStatus,
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
          <h3 className="text-lg font-medium text-gray-900">Детали изменения</h3>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[changeOrder.status] || 'bg-gray-100 text-gray-800'}`}>
            {STATUS_LABELS[changeOrder.status] || changeOrder.status}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Тип</dt>
            <dd className="text-sm font-medium text-gray-900">
              {CHANGE_TYPE_LABELS[changeOrder.change_type] || changeOrder.change_type}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Изменение суммы</dt>
            <dd className={`text-sm font-medium ${changeOrder.delta_amount.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
              {formatTiyin(changeOrder.delta_amount)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-sm text-gray-500">Обоснование</dt>
            <dd className="text-sm text-gray-900">{changeOrder.reason}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Создано</dt>
            <dd className="text-sm text-gray-900">
              {new Date(changeOrder.created_at).toLocaleString('ru-RU')}
            </dd>
          </div>
          {changeOrder.applied_at && (
            <div>
              <dt className="text-sm text-gray-500">Применено</dt>
              <dd className="text-sm text-gray-900">
                {new Date(changeOrder.applied_at).toLocaleString('ru-RU')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {allowedTransitions.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Действия</h3>
          <div className="flex gap-3 flex-wrap">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleTransition(status)}
                disabled={loading}
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
