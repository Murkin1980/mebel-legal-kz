'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChangeOrder } from '../actions';

export function NewChangeForm({
  legalCaseId,
  packages,
}: {
  legalCaseId: string;
  packages: { id: string; template_code: string; version: number; status: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [changeType, setChangeType] = useState('price');
  const [deltaAmount, setDeltaAmount] = useState('');
  const [reason, setReason] = useState('');
  const [packageId, setPackageId] = useState(packages[0]?.id || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createChangeOrder({
      legalCaseId,
      contractPackageId: packageId,
      changeType,
      deltaAmount,
      reason,
    });

    if (result.success) {
      router.push(`/app/cases/${legalCaseId}/changes/${result.data!.changeOrderId}`);
    } else {
      setError(result.error || 'Ошибка создания');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 max-w-2xl">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Пакет договора</label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          >
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.template_code} v{pkg.version} ({pkg.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип изменения</label>
          <select
            value={changeType}
            onChange={(e) => setChangeType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="scope">Объём работ</option>
            <option value="price">Стоимость</option>
            <option value="deadline">Сроки</option>
            <option value="terms">Условия</option>
            <option value="other">Другое</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Изменение суммы (тиины, +/-)
          </label>
          <input
            type="text"
            value={deltaAmount}
            onChange={(e) => setDeltaAmount(e.target.value)}
            placeholder="например, 500000 или -200000"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
            pattern="^-?\d+$"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Обоснование</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Создание...' : 'Создать изменение'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
