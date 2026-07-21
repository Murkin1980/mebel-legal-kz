'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ExecutionCheckpoint, CheckpointStatus, UserRole } from '@/modules/shared/types';
import { CHECKPOINT_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  completeCheckpointAction,
  reopenCheckpointAction,
  createCheckpointAction,
} from '../../../actions';

const PHASE_LABELS: Record<string, string> = {
  drafting: 'Черновик',
  internal_review: 'Внутренняя проверка',
  client_negotiation: 'Согласование с клиентом',
  signed: 'Подписан',
  in_production: 'В производстве',
  delivered: 'Выполнен',
  archived: 'Архив',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  completed: 'Выполнен',
  reopened: 'Переоткрыт',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  reopened: 'bg-orange-100 text-orange-700',
};

const ROLE_LABELS: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Менеджер',
  legal_reviewer: 'Юрист',
  operations: 'Операционист',
};

interface ChecklistsViewProps {
  legalCaseId: string;
  legalCase: { id: string; case_number: string; title: string; status: string };
  checkpoints: ExecutionCheckpoint[];
  phaseMap: Record<string, string>;
  userRole: string;
}

export function ChecklistsView({
  legalCaseId,
  legalCase,
  checkpoints,
  phaseMap,
  userRole,
}: ChecklistsViewProps) {
  const [state, formAction, isPending] = useActionState(
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
  const canManage = ROLE_PERMISSIONS.manage_checkpoints[role];

  const checkpointsByPhase: Record<string, ExecutionCheckpoint[]> = {};
  for (const cp of checkpoints) {
    if (!checkpointsByPhase[cp.execution_phase_id]) {
      checkpointsByPhase[cp.execution_phase_id] = [];
    }
    checkpointsByPhase[cp.execution_phase_id].push(cp);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/app/cases/${legalCaseId}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Назад к кейсу
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Чек-листы</h2>
        <p className="text-sm text-gray-500 mt-1">
          Кейс {legalCase.case_number} — {legalCase.title}
        </p>
      </div>

      {Object.keys(checkpointsByPhase).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500 mb-4">Чек-листы не найдены</p>
          {canManage && (
            <div className="text-sm text-gray-400">
              Создайте execution phase на странице исполнения договора
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(checkpointsByPhase).map(([phaseId, cps]) => (
            <div key={phaseId} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Этап: {PHASE_LABELS[phaseMap[phaseId] || phaseId] || phaseId}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{cps.length} пунктов</p>

              {canManage && (
                <form action={formAction} className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Добавить пункт</h4>
                  <div className="flex gap-2 items-end">
                    <input type="hidden" name="_action" value="create" />
                    <input type="hidden" name="phaseId" value={phaseId} />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Название</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="px-2 py-1.5 text-sm border rounded w-48"
                        placeholder="Название пункта"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Описание</label>
                      <input
                        type="text"
                        name="description"
                        className="px-2 py-1.5 text-sm border rounded w-48"
                        placeholder="Описание (опционально)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Роль</label>
                      <select name="assignedRole" className="px-2 py-1.5 text-sm border rounded">
                        <option value="">Любая</option>
                        <option value="owner">Владелец</option>
                        <option value="manager">Менеджер</option>
                        <option value="legal_reviewer">Юрист</option>
                        <option value="operations">Операционист</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Добавить
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {cps.map((cp) => {
                  const cpStatus = cp.status;
                  const canComplete =
                    canManage &&
                    CHECKPOINT_TRANSITIONS[cpStatus as CheckpointStatus]?.includes('completed');
                  const canReopen =
                    canManage &&
                    CHECKPOINT_TRANSITIONS[cpStatus as CheckpointStatus]?.includes('reopened');

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
                              STATUS_COLORS[cpStatus] || 'bg-gray-100'
                            }`}
                          >
                            {STATUS_LABELS[cpStatus] || cpStatus}
                          </span>
                        </div>
                        {cp.description && (
                          <p className="text-xs text-gray-500 mt-1">{cp.description}</p>
                        )}
                        <div className="flex gap-4 mt-1">
                          {cp.assigned_role && (
                            <span className="text-xs text-gray-400">
                              Роль: {ROLE_LABELS[cp.assigned_role] || cp.assigned_role}
                            </span>
                          )}
                          {cp.completed_at && (
                            <span className="text-xs text-gray-400">
                              Выполнен: {new Date(cp.completed_at).toLocaleString('ru-RU')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {canComplete && (
                          <form action={formAction}>
                            <input type="hidden" name="_action" value="complete" />
                            <input type="hidden" name="checkpointId" value={cp.id} />
                            <button
                              type="submit"
                              disabled={isPending}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                            >
                              Выполнено
                            </button>
                          </form>
                        )}
                        {canReopen && (
                          <form action={formAction}>
                            <input type="hidden" name="_action" value="reopen" />
                            <input type="hidden" name="checkpointId" value={cp.id} />
                            <button
                              type="submit"
                              disabled={isPending}
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
            </div>
          ))}
        </div>
      )}

      {state?.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
    </div>
  );
}
