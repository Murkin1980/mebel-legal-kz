'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientApprovalLink, revokeClientApprovalLink, transitionContractApproval } from '../actions';

interface ApprovalDetailProps {
  approval: Record<string, unknown>;
  legalCase: Record<string, unknown> | null;
  pkg: Record<string, unknown> | null;
  publicLink: Record<string, unknown> | null;
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

const ALLOWED_TRANSITIONS: Record<string, { target: string; label: string; needsDecide: boolean }[]> = {
  draft: [{ target: 'pending_review', label: 'Отправить на согласование', needsDecide: false }],
  pending_review: [
    { target: 'approved', label: 'Согласовать', needsDecide: true },
    { target: 'rejected', label: 'Отказать', needsDecide: true },
    { target: 'revoked', label: 'Отозвать', needsDecide: false },
  ],
};

export function ApprovalDetail({ approval, legalCase, pkg, publicLink, userRole }: ApprovalDetailProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [invite, setInvite] = useState<{ url: string; challenge: string } | null>(null);
  const createInviteCommandId = useRef(crypto.randomUUID());
  const revokeInviteCommandId = useRef(crypto.randomUUID());

  const status = approval.status as string;
  const transitions = ALLOWED_TRANSITIONS[status] || [];
  const canManage = userRole === 'owner' || userRole === 'manager';
  const canDecide = userRole === 'owner' || userRole === 'legal_reviewer';

  async function handleTransition(targetStatus: string) {
    setTransitioning(true);
    setError(null);

    try {
      const result = await transitionContractApproval({
        approvalId: approval.id as string,
        targetStatus,
        notes: notes || undefined,
      });

      if (result.success) {
        router.refresh();
        setNotes('');
      } else {
        setError(result.error || 'Ошибка при изменении статуса');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleCreateInvite() {
    setTransitioning(true);
    setError(null);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = await createClientApprovalLink({ approvalId: approval.id as string, expiresAt, commandId: createInviteCommandId.current });
    if (result.success && result.data) {
      setInvite({ url: `${window.location.origin}/approve/${result.data.token}`, challenge: result.data.challenge });
      router.refresh();
    } else setError(result.error || 'Не удалось создать приглашение');
    setTransitioning(false);
  }

  async function handleRevokeInvite() {
    if (!publicLink) return;
    setTransitioning(true);
    const result = await revokeClientApprovalLink({ approvalId: approval.id as string, linkId: publicLink.id as string, commandId: revokeInviteCommandId.current });
    if (!result.success) setError(result.error || 'Не удалось отозвать приглашение');
    else { setInvite(null); router.refresh(); }
    setTransitioning(false);
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/approvals" className="text-sm text-blue-600 hover:underline">← Согласования</Link>
      </div>

      {canManage && status === 'pending_review' && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h2 className="font-semibold text-blue-900">Приглашение клиенту</h2>
          <p className="mt-1 text-sm text-blue-800">Ссылка не показывает содержимое договора. Решение требует отдельного одноразового кода.</p>
          {!publicLink ? (
            <button onClick={handleCreateInvite} disabled={transitioning} className="mt-3 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Создать ссылку на 7 дней</button>
          ) : (
            <div className="mt-3 text-sm text-blue-900">
              <p>Статус ссылки: {String(publicLink.status)}</p>
              {publicLink.status === 'active' && <button onClick={handleRevokeInvite} disabled={transitioning} className="mt-2 rounded-md bg-white px-3 py-2 font-medium text-red-700">Отозвать ссылку</button>}
            </div>
          )}
          {invite && (
            <div className="mt-4 rounded-md bg-white p-3 text-sm text-gray-900">
              <p className="font-semibold text-red-700">Сохраните сейчас: код повторно не показывается.</p>
              <p className="mt-2 break-all"><b>Ссылка:</b> {invite.url}</p>
              <p className="mt-1 font-mono text-lg"><b>Код:</b> {invite.challenge}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Согласование</h1>
          <p className="text-sm text-gray-500 font-mono">{(approval.id as string).slice(0, 8)}…</p>
        </div>
        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
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
              <dt className="text-sm text-gray-500">Кейс</dt>
              <dd className="text-sm text-gray-900">
                {legalCase ? (
                  <Link href={`/app/cases/${approval.legal_case_id}`} className="text-blue-600 hover:underline">
                    {legalCase.case_number as string} — {legalCase.title as string}
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Пакет</dt>
              <dd className="text-sm text-gray-900">
                {pkg ? (
                  <Link
                    href={`/app/cases/${approval.legal_case_id}/packages/${approval.contract_package_id}`}
                    className="text-blue-600 hover:underline font-mono"
                  >
                    v{pkg.version as number} ({pkg.template_code as string})
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Запрошено</dt>
              <dd className="text-sm text-gray-900">
                {new Date(approval.created_at as string).toLocaleDateString('ru-RU')}
              </dd>
            </div>
            {approval.decided_at != null && (
              <div>
                <dt className="text-sm text-gray-500">Решение принято</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(approval.decided_at as string).toLocaleDateString('ru-RU')}
                </dd>
              </div>
            )}
            {approval.notes != null && (
              <div>
                <dt className="text-sm text-gray-500">Заметки</dt>
                <dd className="text-sm text-gray-900">{String(approval.notes)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Действия</h2>
          {transitions.length === 0 ? (
            <p className="text-sm text-gray-500">Терминальное состояние — нет доступных действий</p>
          ) : (
            <div className="space-y-3">
              {(status === 'rejected' || status === 'revoked') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Заметки (обязательно)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Причина отказа/отзыва..."
                  />
                </div>
              )}
              {transitions.map((t) => {
                const allowed = t.needsDecide ? canDecide : canManage;
                if (!allowed) return null;

                return (
                  <button
                    key={t.target}
                    onClick={() => handleTransition(t.target)}
                    disabled={transitioning}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium ${
                      t.target === 'approved'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : t.target === 'rejected' || t.target === 'revoked'
                          ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    } disabled:opacity-50`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {pkg && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Содержимое пакета</h2>
          <pre className="bg-gray-50 rounded-md p-4 text-sm overflow-auto max-h-96">
            {JSON.stringify(pkg, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
