'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import type { CaseStatus, UserRole } from '@/modules/shared/types';
import { CASE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import { transitionCaseStatus } from '../actions';

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Черновик',
  data_collection: 'Сбор данных',
  ready_for_review: 'На проверке',
  approved: 'Утверждён',
  suspended: 'Приостановлен',
  closed: 'Закрыт',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
  data_collection: 'bg-blue-100 text-blue-800 border-blue-300',
  ready_for_review: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  suspended: 'bg-orange-100 text-orange-800 border-orange-300',
  closed: 'bg-purple-100 text-purple-800 border-purple-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const TRANSITION_DESCRIPTIONS: Record<string, string> = {
  draft: 'Начать сбор данных',
  data_collection: 'Вернуться к сбору данных',
  ready_for_review: 'Отправить на проверку',
  approved: 'Утвердить кейс',
  suspended: 'Приостановить',
  closed: 'Закрыть кейс',
  cancelled: 'Отменить кейс',
};

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  designer: 'Дизайнер',
  legal_reviewer: 'Юрист',
  observer: 'Наблюдатель',
};

function getPermissionForTransition(targetStatus: string): string | null {
  if (targetStatus === 'approved') return 'transition_to_approved';
  if (targetStatus === 'closed' || targetStatus === 'cancelled') return 'close_or_cancel';
  return null;
}

function canRoleTransition(role: UserRole, targetStatus: string): boolean {
  const permission = getPermissionForTransition(targetStatus);
  if (!permission) return true;
  return ROLE_PERMISSIONS[permission as keyof typeof ROLE_PERMISSIONS]?.[role] ?? false;
}

interface CaseDetailProps {
  caseData: {
    id: string;
    case_number: string;
    title: string;
    customer_type: string;
    customer_display_name: string;
    project_type: string;
    status: string;
    currency: string;
    total_amount_tiyin: string | null;
    source_type: string;
    version: number;
    created_at: string;
    updated_at: string;
  };
  userRole: UserRole;
}

export function CaseDetail({ caseData, userRole }: CaseDetailProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; version?: number } | null, formData: FormData) => {
      const result = await transitionCaseStatus({
        caseId: caseData.id,
        version: caseData.version,
        targetStatus: formData.get('targetStatus') as string,
      });

      if (!result.success) {
        if (result.errorCode === 'OPTIMISTIC_CONCURRENCY_CONFLICT') {
          return { error: 'Кейс был изменён другим пользователем. Обновите страницу для получения актуальных данных.' };
        }
        return { error: result.error || 'Ошибка выполнения операции' };
      }

      return { version: result.data?.version };
    },
    null
  );

  const currentStatus = caseData.status as CaseStatus;
  const allowedTransitions = CASE_TRANSITIONS[currentStatus];
  const isTerminal = allowedTransitions.length === 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none focus:underline"
        >
          ← Назад к списку
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {caseData.case_number}
            </h2>
            <p className="text-gray-600 mt-1">{caseData.title}</p>
          </div>
          <div className="text-right">
            <span
              className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full border ${STATUS_COLORS[currentStatus]}`}
            >
              {STATUS_LABELS[currentStatus]}
            </span>
            <p className="text-xs text-gray-500 mt-1">Версия: {caseData.version}</p>
          </div>
        </div>

        {/* State Machine Visualization */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Жизненный цикл кейса
          </h3>
          <div className="flex flex-wrap gap-2">
            {(['draft', 'data_collection', 'ready_for_review', 'approved', 'suspended', 'closed', 'cancelled'] as CaseStatus[]).map((status) => {
              const isCurrent = status === currentStatus;
              const isAllowed = allowedTransitions.includes(status);
              const canTransition = isAllowed && canRoleTransition(userRole, status);
              const deniedByRole = isAllowed && !canRoleTransition(userRole, status);

              return (
                <div
                  key={status}
                  className={`px-3 py-1.5 text-xs font-medium rounded border ${
                    isCurrent
                      ? `${STATUS_COLORS[status]} ring-2 ring-offset-1 ring-blue-500`
                      : isAllowed && canTransition
                      ? `${STATUS_COLORS[status]} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-300`
                      : isAllowed && deniedByRole
                      ? `${STATUS_COLORS[status]} opacity-50`
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                  }`}
                  title={
                    isCurrent
                      ? 'Текущий статус'
                      : isAllowed && canTransition
                      ? `${TRANSITION_DESCRIPTIONS[status]} (доступно вам)`
                      : isAllowed && deniedByRole
                      ? `Недоступно для роли «${ROLE_LABELS[userRole]}»`
                      : 'Недоступно'
                  }
                >
                  {isCurrent && '● '}
                  {STATUS_LABELS[status]}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Текущий статус выделен рамкой. Доступные переходы подсвечены.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Информация о клиенте
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Тип</dt>
                <dd className="text-sm text-gray-900">
                  {caseData.customer_type === 'individual' && 'Физическое лицо'}
                  {caseData.customer_type === 'individual_entrepreneur' && 'ИП'}
                  {caseData.customer_type === 'legal_entity' && 'Юридическое лицо'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Имя</dt>
                <dd className="text-sm text-gray-900">{caseData.customer_display_name}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Проект
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Тип проекта</dt>
                <dd className="text-sm text-gray-900">
                  {caseData.project_type === 'manufacture_only' && 'Только производство'}
                  {caseData.project_type === 'manufacture_delivery' && 'Производство + доставка'}
                  {caseData.project_type === 'manufacture_delivery_installation' && 'Производство + доставка + установка'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Сумма</dt>
                <dd className="text-sm text-gray-900">
                  {caseData.total_amount_tiyin
                    ? `${(Number(caseData.total_amount_tiyin) / 100).toLocaleString('ru-RU')} ₸`
                    : 'Не указана'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Метаданные
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Валюта</dt>
                <dd className="text-sm text-gray-900">{caseData.currency}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Источник</dt>
                <dd className="text-sm text-gray-900">{caseData.source_type}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Даты
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Создан</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(caseData.created_at).toLocaleString('ru-RU')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Обновлён</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(caseData.updated_at).toLocaleString('ru-RU')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Error Display */}
        {state?.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-700">{state.error}</p>
            {state.error.includes('изменён другим') && (
              <button
                onClick={() => router.refresh()}
                className="mt-2 text-sm text-red-600 underline hover:text-red-800"
              >
                Обновить данные
              </button>
            )}
          </div>
        )}

        {/* Available Transitions */}
        {!isTerminal && allowedTransitions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Доступные действия
            </h3>
            <div className="space-y-2">
              {allowedTransitions.map((status) => {
                const allowed = canRoleTransition(userRole, status);
                const deniedByRole = !allowed;
                const permission = getPermissionForTransition(status);
                const requiredRole = permission === 'transition_to_approved'
                  ? 'Владелец или Юрист'
                  : permission === 'close_or_cancel'
                  ? 'Владелец или Менеджер'
                  : 'Владелец, Менеджер или Дизайнер';

                return (
                  <form key={status} action={formAction} className="flex items-center gap-3">
                    <input type="hidden" name="targetStatus" value={status} />
                    <button
                      type="submit"
                      disabled={isPending || deniedByRole}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        status === 'cancelled'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400'
                      } disabled:cursor-not-allowed`}
                      title={deniedByRole ? `Требуется роль: ${requiredRole}` : TRANSITION_DESCRIPTIONS[status]}
                    >
                      {isPending ? 'Выполнение...' : `→ ${STATUS_LABELS[status]}`}
                    </button>
                    {deniedByRole && (
                      <span className="text-xs text-gray-500">
                        Требуется роль: {requiredRole}
                      </span>
                    )}
                  </form>
                );
              })}
            </div>
          </div>
        )}

        {isTerminal && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Кейс в терминальном статусе. Дополнительные действия недоступны.
            </p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Примечание:</strong> Статус «Утверждён» означает только внутреннее утверждение карточки кейса.
            Он <strong>не означает</strong>, что договор юридически проверен, сформирован или подписан.
          </p>
        </div>
      </div>
    </div>
  );
}
