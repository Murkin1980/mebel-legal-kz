'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { transitionContractTemplate } from '../actions';

interface Template {
  id: string;
  code: string;
  title: string;
  customer_type: string;
  project_type: string;
  status: string;
  schema: Record<string, unknown>;
  created_at: string;
  created_by: string;
}

interface TemplateDetailProps {
  template: Template;
  canManage: boolean;
  canPublish: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  expert_review: 'Экспертиза',
  published: 'Опубликован',
  retired: 'Выведен',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  expert_review: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: 'Физ. лицо',
  individual_entrepreneur: 'ИП',
  legal_entity: 'Юр. лицо',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  manufacture_only: 'Только производство',
  manufacture_delivery: 'Производство + доставка',
  manufacture_delivery_installation: 'Производство + доставка + монтаж',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['expert_review', 'retired'],
  expert_review: ['published', 'retired'],
  published: ['retired'],
  retired: [],
};

const TRANSITION_LABELS: Record<string, string> = {
  expert_review: 'На экспертизу',
  published: 'Опубликовать',
  retired: 'Вывести из эксплуатации',
};

export function TemplateDetail({ template, canManage, canPublish }: TemplateDetailProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTransitions = ALLOWED_TRANSITIONS[template.status] || [];

  async function handleTransition(targetStatus: string) {
    setTransitioning(true);
    setError(null);

    try {
      const result = await transitionContractTemplate({
        templateId: template.id,
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
        <Link href="/app/templates" className="text-sm text-blue-600 hover:underline">← Шаблоны</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>
          <p className="text-sm text-gray-500 font-mono">{template.code}</p>
        </div>
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[template.status]}`}>
          {STATUS_LABELS[template.status]}
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
              <dt className="text-sm text-gray-500">Тип клиента</dt>
              <dd className="text-sm text-gray-900">{CUSTOMER_TYPE_LABELS[template.customer_type]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Тип проекта</dt>
              <dd className="text-sm text-gray-900">{PROJECT_TYPE_LABELS[template.project_type]}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Создан</dt>
              <dd className="text-sm text-gray-900">{new Date(template.created_at).toLocaleDateString('ru-RU')}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Действия</h2>
          {allowedTransitions.length === 0 ? (
            <p className="text-sm text-gray-500">Нет доступных действий</p>
          ) : (
            <div className="space-y-2">
              {allowedTransitions.map(status => {
                const needsPublish = status === 'published';
                const allowed = needsPublish ? canPublish : canManage;

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
        <h2 className="text-lg font-semibold mb-4">Схема шаблона (JSON)</h2>
        <pre className="bg-gray-50 rounded-md p-4 text-sm overflow-auto max-h-96">
          {JSON.stringify(template.schema, null, 2)}
        </pre>
      </div>
    </div>
  );
}
