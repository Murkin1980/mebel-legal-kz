'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveLegalRule } from '../../actions';
import type { LegalRuleStatus } from '@/modules/shared/types';

const STATUS_LABELS: Record<LegalRuleStatus, string> = {
  draft: 'Черновик',
  under_review: 'На проверке',
  approved: 'Утверждено',
  retired: 'Устаревшее',
};

const STATUS_COLORS: Record<LegalRuleStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  retired: 'bg-red-100 text-red-800',
};

interface Rule {
  id: string;
  code: string;
  title: string;
  description: string;
  status: LegalRuleStatus;
  logic: Record<string, unknown>;
  created_at: string;
}

interface SourceRevision {
  id: string;
  revision_number: number;
  content_hash: string;
  source_title: string;
  source_id: string;
}

interface Props {
  rule: Rule;
  sourceRevision: SourceRevision | null;
  userRole: string;
  canApprove: boolean;
}

export function RuleDetail({ rule, sourceRevision, canApprove }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove(targetStatus: string) {
    startTransition(async () => {
      const result = await approveLegalRule({ ruleId: rule.id, targetStatus });
      if (result.success) router.refresh();
    });
  }

  const nextStatuses: LegalRuleStatus[] = [];
  if (rule.status === 'draft') nextStatuses.push('under_review');
  if (rule.status === 'under_review') nextStatuses.push('approved');
  if (rule.status === 'approved') nextStatuses.push('retired');

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/legal/rules" className="text-blue-600 hover:underline text-sm">
          ← К списку правил
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              <span className="font-mono text-blue-600">{rule.code}</span>
            </h2>
            <p className="text-lg text-gray-700 mt-1">{rule.title}</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[rule.status]}`}>
            {STATUS_LABELS[rule.status]}
          </span>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          {rule.description}
        </div>
      </div>

      {sourceRevision && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Привязанная редакция</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Источник:</span>{' '}
              <Link href={`/app/legal/sources/${sourceRevision.source_id}`} className="text-blue-600 hover:underline">
                {sourceRevision.source_title}
              </Link>
            </div>
            <div>
              <span className="text-gray-500">Ревизия:</span>{' '}
              <span className="text-gray-900">v{sourceRevision.revision_number}</span>
            </div>
            <div>
              <span className="text-gray-500">Хеш:</span>{' '}
              <span className="text-gray-900 font-mono text-xs">{sourceRevision.content_hash}</span>
            </div>
          </div>
        </div>
      )}

      {Object.keys(rule.logic).length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Логика правила</h3>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(rule.logic, null, 2)}
          </pre>
        </div>
      )}

      {canApprove && nextStatuses.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Перевести статус</h3>
          <div className="flex gap-2">
            {nextStatuses.map(ns => (
              <button
                key={ns}
                onClick={() => handleApprove(ns)}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isPending ? '...' : STATUS_LABELS[ns]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-800">
          Правила не содержат исполняемого кода. AI не участвует в создании или применении правил.
        </p>
      </div>
    </div>
  );
}
