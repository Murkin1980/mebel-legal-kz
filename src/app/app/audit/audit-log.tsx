'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const EVENT_TYPE_LABELS: Record<string, string> = {
  'case.created': 'Создан кейс',
  'case.updated': 'Обновлён кейс',
  'case.status_changed': 'Изменён статус',
  'organization.created': 'Создана организация',
  'member.added': 'Добавлен участник',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  'case.created': 'bg-green-100 text-green-800',
  'case.updated': 'bg-blue-100 text-blue-800',
  'case.status_changed': 'bg-yellow-100 text-yellow-800',
  'organization.created': 'bg-purple-100 text-purple-800',
  'member.added': 'bg-indigo-100 text-indigo-800',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  'legal_case': 'Кейс',
  'organization': 'Организация',
  'organization_membership': 'Участник',
};

interface AuditEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_user_id: string | null;
  command_id: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

interface AuditLogProps {
  events: AuditEvent[];
  orgName: string;
  canViewCases: boolean;
}

function formatPayload(payload: Record<string, unknown>): string {
  const parts: string[] = [];

  if (payload.case_number) parts.push(`Кейс: ${payload.case_number}`);
  if (payload.title) parts.push(`«${payload.title}»`);
  if (payload.from_status && payload.to_status) {
    parts.push(`${payload.from_status} → ${payload.to_status}`);
  }
  if (payload.status) parts.push(`Статус: ${payload.status}`);
  if (payload.name) parts.push(`Название: ${payload.name}`);
  if (payload.role) parts.push(`Роль: ${payload.role}`);
  if (payload.user_id) parts.push(`Пользователь: ${String(payload.user_id).substring(0, 8)}...`);
  if (payload.changes) {
    const changes = payload.changes as Record<string, unknown>;
    const changeKeys = Object.keys(changes);
    if (changeKeys.length > 0) {
      parts.push(`Изменения: ${changeKeys.join(', ')}`);
    }
  }
  if (payload.previous_version !== undefined && payload.new_version !== undefined) {
    parts.push(`Версия: ${payload.previous_version} → ${payload.new_version}`);
  }

  return parts.join(' • ') || 'Нет данных';
}

export function AuditLog({ events, orgName, canViewCases }: AuditLogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [eventType, setEventType] = useState(searchParams.get('eventType') || '');
  const [entityType, setEntityType] = useState(searchParams.get('entityType') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEvents = events.filter((event) => {
    if (eventType && event.event_type !== eventType) return false;
    if (entityType && event.entity_type !== entityType) return false;
    if (dateFrom && new Date(event.occurred_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(event.occurred_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/app/audit?${params.toString()}`);
  };

  const hasActiveFilters = eventType || entityType || dateFrom || dateTo;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Журнал аудита
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Организация: {orgName} • Только чтение
        </p>
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <select
              value={eventType}
              onChange={(e) => handleFilterChange('eventType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Фильтр по типу события"
            >
              <option value="">Все события</option>
              {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Фильтр по типу сущности"
            >
              <option value="">Все сущности</option>
              {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Дата от"
              placeholder="От"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Дата до"
              placeholder="До"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setEventType('');
                  setEntityType('');
                  setDateFrom('');
                  setDateTo('');
                  router.push('/app/audit');
                }}
                className="px-3 py-2 text-red-600 text-sm hover:text-red-800"
              >
                Сбросить фильтры
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <div className="text-gray-400 text-4xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters ? 'Нет событий по заданным фильтрам' : 'Нет событий аудита'}
          </h3>
          <p className="text-gray-500">
            {hasActiveFilters
              ? 'Попробуйте изменить параметры фильтрации.'
              : 'События аудита появятся после выполнения действий в системе.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Найдено: {filteredEvents.length} из {events.length}
            </span>
            <span className="text-xs text-gray-400">
              История дополнена и не может быть изменена
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип события
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Описание
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Детали
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.occurred_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${EVENT_TYPE_COLORS[event.event_type] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {ENTITY_TYPE_LABELS[event.entity_type] || event.entity_type}
                        </span>
                        {event.entity_type === 'legal_case' && canViewCases && (
                          <Link
                            href={`/app/cases/${event.entity_id}`}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                            title="Перейти к кейсу"
                          >
                            →
                          </Link>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatPayload(event.payload)}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {event.actor_user_id
                        ? `${event.actor_user_id.substring(0, 8)}...`
                        : 'system'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs focus:outline-none focus:underline"
                        aria-expanded={expandedId === event.id}
                      >
                        {expandedId === event.id ? 'Скрыть' : 'Показать'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expandedId && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Payload события
              </h4>
              <pre className="text-xs text-gray-700 bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify(
                  events.find((e) => e.id === expandedId)?.payload,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
