'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createContractApproval } from '../actions';

interface NewApprovalFormProps {
  cases: Record<string, unknown>[];
  packages: Record<string, unknown>[];
}

export function NewApprovalForm({ cases, packages }: NewApprovalFormProps) {
  const router = useRouter();
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPackages = selectedCaseId
    ? packages.filter((p) => p.legal_case_id === selectedCaseId)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCaseId || !selectedPackageId) {
      setError('Выберите кейс и пакет');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await createContractApproval({
        legalCaseId: selectedCaseId,
        contractPackageId: selectedPackageId,
        notes: notes || undefined,
      });

      if (result.success) {
        router.push('/app/approvals');
      } else {
        setError(result.error || 'Ошибка при создании');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/approvals" className="text-sm text-blue-600 hover:underline">← Согласования</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новое согласование</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кейс *</label>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                setSelectedPackageId('');
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
            >
              <option value="">Выберите кейс</option>
              {cases.map((c) => (
                <option key={c.id as string} value={c.id as string}>
                  {c.case_number as string} — {c.title as string}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пакет *</label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              required
              disabled={!selectedCaseId}
            >
              <option value="">Выберите пакет</option>
              {filteredPackages.map((p) => (
                <option key={p.id as string} value={p.id as string}>
                  v{p.version as number} — {p.template_code as string} ({p.status as string})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              rows={3}
              placeholder="Комментарий к запросу согласования..."
            />
          </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Создание...' : 'Создать согласование'}
          </button>
          <Link
            href="/app/approvals"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
