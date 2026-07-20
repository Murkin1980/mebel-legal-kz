'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { transitionContractApproval } from './actions';

interface Approval {
  id: string;
  legal_case_id: string;
  contract_package_id: string;
  status: string;
  requested_by: string;
  decided_by: string | null;
  decided_at: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
}

interface ApprovalsListProps {
  approvals: Record<string, unknown>[];
  caseMap: Map<string, { case_number: string; title: string }>;
  userRole: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  pending_review: 'На согласовании',
  approved: 'Согласовано',
  rejected: 'Отказано',
  revoked: 'Отозвано',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  pending_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  revoked: 'bg-orange-100 text-orange-800',
};

export function ApprovalsList({ approvals, caseMap, userRole }: ApprovalsListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = userRole === 'owner' || userRole === 'manager';
  const canDecide = userRole === 'owner' || userRole === 'legal_reviewer';

  const filtered = statusFilter === 'all'
    ? approvals
    : approvals.filter((a) => a.status === statusFilter);

  async function handleTransition(approvalId: string, targetStatus: string, notes?: string) {
    setActionLoading(approvalId);
    setError(null);

    try {
      const result = await transitionContractApproval({
        approvalId,
        targetStatus,
        notes: notes || undefined,
      });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || 'Ошибка при изменении статуса');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setActionLoading(null);
    }
  }

  function getAllowedTransitions(status: string): { target: string; label: string; needsDecide: boolean }[] {
    switch (status) {
      case 'draft':
        return [{ target: 'pending_review', label: 'Отправить на согласование', needsDecide: false }];
      case 'pending_review':
        return [
          { target: 'approved', label: 'Согласовать', needsDecide: true },
          { target: 'rejected', label: 'Отказать', needsDecide: true },
          { target: 'revoked', label: 'Отозвать', needsDecide: false },
        ];
      default:
        return [];
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Согласования</h1>
        {canManage && (
          <Link
            href="/app/approvals/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Новое согласование
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="pending_review">На согласовании</option>
          <option value="approved">Согласовано</option>
          <option value="rejected">Отказано</option>
          <option value="revoked">Отозвано</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Нет согласований</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Кейс</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пакет</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Создано</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((approval) => {
                const approvalTyped = approval as unknown as Approval;
                const caseInfo = caseMap.get(approvalTyped.legal_case_id);
                const transitions = getAllowedTransitions(approvalTyped.status);

                return (
                  <tr key={approvalTyped.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/app/cases/${approvalTyped.legal_case_id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {caseInfo?.case_number || '—'}
                      </Link>
                      <p className="text-xs text-gray-500">{caseInfo?.title || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/app/cases/${approvalTyped.legal_case_id}/packages/${approvalTyped.contract_package_id}`}
                        className="text-sm text-blue-600 hover:underline font-mono"
                      >
                        Пакет
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[approvalTyped.status]}`}>
                        {STATUS_LABELS[approvalTyped.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(approvalTyped.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Link
                          href={`/app/approvals/${approvalTyped.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Детали
                        </Link>
                        {transitions.map((t) => {
                          const allowed = t.needsDecide ? canDecide : canManage;
                          if (!allowed) return null;

                          return (
                            <button
                              key={t.target}
                              onClick={() => handleTransition(approvalTyped.id, t.target)}
                              disabled={actionLoading === approvalTyped.id}
                              className={`text-sm px-2 py-1 rounded ${
                                t.target === 'approved'
                                  ? 'text-green-700 hover:bg-green-50'
                                  : t.target === 'rejected' || t.target === 'revoked'
                                    ? 'text-red-700 hover:bg-red-50'
                                    : 'text-blue-700 hover:bg-blue-50'
                              } disabled:opacity-50`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
