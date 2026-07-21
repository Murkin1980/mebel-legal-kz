'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type {
  ContractExecutionPhase,
  ExecutionCheckpoint,
  ExecutionPaymentsSummary,
  ExecutionPhaseName,
  UserRole,
} from '@/modules/shared/types';
import {
  EXECUTION_PHASE_TRANSITIONS,
  CHECKPOINT_TRANSITIONS,
  ROLE_PERMISSIONS,
} from '@/modules/shared/types';
import {
  transitionExecutionPhaseAction,
  completeCheckpointAction,
  reopenCheckpointAction,
  createCheckpointAction,
} from '../../actions';

const PHASE_LABELS: Record<ExecutionPhaseName, string> = {
  drafting: 'Черновик',
  internal_review: 'Внутренняя проверка',
  client_negotiation: 'Согласование с клиентом',
  signed: 'Подписан',
  in_production: 'В производстве',
  delivered: 'Выполнен',
  archived: 'Архив',
};

const PHASE_COLORS: Record<string, string> = {
  drafting: 'bg-gray-100 text-gray-800 border-gray-300',
  internal_review: 'bg-blue-100 text-blue-800 border-blue-300',
  client_negotiation: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  signed: 'bg-green-100 text-green-800 border-green-300',
  in_production: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  archived: 'bg-purple-100 text-purple-800 border-purple-300',
};

const CHECKPOINT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  completed: 'Выполнен',
  reopened: 'Переоткрыт',
};

const CHECKPOINT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  reopened: 'bg-orange-100 text-orange-700',
};

const ASSIGNED_ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  legal_reviewer: 'Юрист',
  operations: 'Операционист',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает оплаты',
  partial: 'Частично оплачен',
  paid: 'Оплачен',
  overdue: 'Просрочен',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
};

function formatTiyin(amount: string): string {
  const num = parseInt(amount, 10);
  return (num / 100).toLocaleString('ru-RU') + ' ₸';
}

interface ExecutionViewProps {
  legalCaseId: string;
  legalCase: { id: string; case_number: string; title: string; status: string };
  phases: ContractExecutionPhase[];
  checkpointsByPhase: Record<string, ExecutionCheckpoint[]>;
  summaries: ExecutionPaymentsSummary[];
  userRole: string;
}

export function ExecutionView({
  legalCaseId,
  legalCase,
  phases,
  checkpointsByPhase,
  summaries,
  userRole,
}: ExecutionViewProps) {
  const [transitionState, transitionAction, transitionPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await transitionExecutionPhaseAction({
        executionPhaseId: formData.get('phaseId') as string,
        targetPhase: formData.get('targetPhase') as string,
      });
      if (!result.success) {
        return { error: result.error || 'Ошибка перехода' };
      }
      return null;
    },
    null
  );

  const [checkpointFormState, checkpointFormAction, checkpointFormPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const action = formData.get('_action') as string;
      const checkpointId = formData.get('checkpointId') as string;

      if (action === 'complete') {
        const result = await completeCheckpointAction({ checkpointId });
        if (!result.success) return { error: result.error || 'Ошибка' };
      } else if (action === 'reopen') {
        const result = await reopenCheckpointAction({ checkpointId });
        if (!result.success) return { error: result.error || 'Ошибка' };
      } else if (action === 'create') {
        const result = await createCheckpointAction({
          executionPhaseId: formData.get('phaseId') as string,
          name: formData.get('name') as string,
          description: formData.get('description') as string || undefined,
          assignedRole: formData.get('assignedRole') as string || null,
        });
        if (!result.success) return { error: result.error || 'Ошибка' };
      }
      return null;
    },
    null
  );

  const role = userRole as UserRole;
  const canManagePhase = ROLE_PERMISSIONS.manage_execution_phase[role];
  const canManageCheckpoints = ROLE_PERMISSIONS.manage_checkpoints[role];
  const canViewSummaries = ROLE_PERMISSIONS.view_payments_summary[role];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/app/cases/${legalCaseId}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Назад к кейсу
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Исполнение договора</h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>

      {phases.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-4">Операционный цикл ещё не создан для этого кейса</p>
          {canManagePhase && (
            <form action={checkpointFormAction}>
              <input type="hidden" name="_action" value="create" />
              Требуется создать execution phase через сервис
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {phases.map((phase) => {
            const currentPhase = phase.current_phase as ExecutionPhaseName;
            const allowedTransitions = EXECUTION_PHASE_TRANSITIONS[currentPhase];
            const isTerminal = allowedTransitions.length === 0;
            const checkpoints = checkpointsByPhase[phase.id] || [];

            return (
              <div key={phase.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Текущий этап: {PHASE_LABELS[currentPhase]}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Статус: {phase.status === 'active' ? 'Активен' : phase.status === 'on_hold' ? 'На паузе' : 'Закрыт'}
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Жизненный цикл исполнения</h4>
                  <div className="flex flex-wrap gap-2">
                    {([
                      'drafting',
                      'internal_review',
                      'client_negotiation',
                      'signed',
                      'in_production',
                      'delivered',
                      'archived',
                    ] as ExecutionPhaseName[]).map((p) => {
                      const isCurrent = p === currentPhase;
                      const isAllowed = allowedTransitions.includes(p);
                      const canTransition = isAllowed && canManagePhase;

                      return (
                        <form
                          key={p}
                          action={transitionAction}
                          className="inline"
                          onSubmit={(e) => {
                            if (!canTransition) e.preventDefault();
                          }}
                        >
                          <input type="hidden" name="phaseId" value={phase.id} />
                          <input type="hidden" name="targetPhase" value={p} />
                          <button
                            type="submit"
                            disabled={!canTransition || transitionPending}
                            className={`px-3 py-1.5 text-xs font-medium rounded border ${
                              isCurrent
                                ? `${PHASE_COLORS[p]} ring-2 ring-offset-1 ring-blue-500`
                                : isAllowed && canTransition
                                ? `${PHASE_COLORS[p]} cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-300`
                                : isAllowed
                                ? `${PHASE_COLORS[p]} opacity-50`
                                : 'bg-gray-50 text-gray-400 border-gray-200'
                            } disabled:cursor-not-allowed`}
                            title={
                              isCurrent
                                ? 'Текущий этап'
                                : isAllowed && canTransition
                                ? `Перейти на этап «${PHASE_LABELS[p]}»`
                                : isAllowed
                                ? 'Недоступно для вашей роли'
                                : 'Недоступно'
                            }
                          >
                            {isCurrent && '● '}
                            {PHASE_LABELS[p]}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                  {!isTerminal && canManagePhase && (
                    <p className="text-xs text-gray-500 mt-2">
                      Нажмите на доступный этап для перехода
                    </p>
                  )}
                </div>

                {transitionState?.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{transitionState.error}</p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Чек-листы</h4>
                    {canManageCheckpoints && (
                      <form action={checkpointFormAction} className="flex gap-2 items-end">
                        <input type="hidden" name="_action" value="create" />
                        <input type="hidden" name="phaseId" value={phase.id} />
                        <div>
                          <input
                            type="text"
                            name="name"
                            placeholder="Название пункта"
                            required
                            className="px-2 py-1 text-sm border rounded"
                          />
                        </div>
                        <div>
                          <select name="assignedRole" className="px-2 py-1 text-sm border rounded">
                            <option value="">Любая роль</option>
                            <option value="owner">Владелец</option>
                            <option value="manager">Менеджер</option>
                            <option value="legal_reviewer">Юрист</option>
                            <option value="operations">Операционист</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={checkpointFormPending}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          Добавить
                        </button>
                      </form>
                    )}
                  </div>

                  {checkpoints.length === 0 ? (
                    <p className="text-sm text-gray-500 py-3">Чек-листы не добавлены</p>
                  ) : (
                    <div className="space-y-2">
                      {checkpoints.map((cp) => {
                        const cpStatus = cp.status;
                        const canComplete =
                          canManageCheckpoints &&
                          CHECKPOINT_TRANSITIONS[cpStatus as keyof typeof CHECKPOINT_TRANSITIONS]?.includes('completed');
                        const canReopen =
                          canManageCheckpoints &&
                          CHECKPOINT_TRANSITIONS[cpStatus as keyof typeof CHECKPOINT_TRANSITIONS]?.includes('reopened');

                        return (
                          <div
                            key={cp.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{cp.name}</span>
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                    CHECKPOINT_STATUS_COLORS[cpStatus] || 'bg-gray-100'
                                  }`}
                                >
                                  {CHECKPOINT_STATUS_LABELS[cpStatus] || cpStatus}
                                </span>
                              </div>
                              {cp.description && (
                                <p className="text-xs text-gray-500 mt-1">{cp.description}</p>
                              )}
                              {cp.assigned_role && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Роль: {ASSIGNED_ROLE_LABELS[cp.assigned_role] || cp.assigned_role}
                                </p>
                              )}
                              {cp.completed_at && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Выполнен: {new Date(cp.completed_at).toLocaleString('ru-RU')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              {canComplete && (
                                <form action={checkpointFormAction}>
                                  <input type="hidden" name="_action" value="complete" />
                                  <input type="hidden" name="checkpointId" value={cp.id} />
                                  <button
                                    type="submit"
                                    disabled={checkpointFormPending}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                                  >
                                    Выполнено
                                  </button>
                                </form>
                              )}
                              {canReopen && (
                                <form action={checkpointFormAction}>
                                  <input type="hidden" name="_action" value="reopen" />
                                  <input type="hidden" name="checkpointId" value={cp.id} />
                                  <button
                                    type="submit"
                                    disabled={checkpointFormPending}
                                    className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
                                  >
                                    Переоткрыть
                                  </button>
                                </form>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {checkpointFormState?.error && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{checkpointFormState.error}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canViewSummaries && summaries.length > 0 && (
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Платёжное исполнение</h3>
          <div className="space-y-4">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded border border-gray-200"
              >
                <div>
                  <p className="text-sm text-gray-500">
                    Пакет: {summary.contract_package_id.substring(0, 8)}...
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <span className="text-xs text-gray-500">Всего:</span>
                      <span className="ml-1 text-sm font-medium text-gray-900">
                        {formatTiyin(summary.total_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Оплачено:</span>
                      <span className="ml-1 text-sm font-medium text-green-700">
                        {formatTiyin(summary.paid_amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Остаток:</span>
                      <span className="ml-1 text-sm font-medium text-gray-900">
                        {formatTiyin(
                          (BigInt(summary.total_amount) - BigInt(summary.paid_amount)).toString()
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    PAYMENT_STATUS_COLORS[summary.status] || 'bg-gray-100'
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[summary.status] || summary.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
