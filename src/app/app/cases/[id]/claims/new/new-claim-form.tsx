'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClaim } from '../actions';

export function NewClaimForm({
  legalCaseId,
  packages,
  changeOrders,
}: {
  legalCaseId: string;
  packages: { id: string; template_code: string; version: number }[];
  changeOrders: { id: string; number: string; status: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [claimType, setClaimType] = useState('quality');
  const [packageId, setPackageId] = useState('');
  const [changeOrderId, setChangeOrderId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createClaim({
      legalCaseId,
      contractPackageId: packageId || null,
      changeOrderId: changeOrderId || null,
      type: claimType,
    });

    if (result.success) {
      router.push(`/app/cases/${legalCaseId}/claims/${result.data!.claimId}`);
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип претензии</label>
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="quality">Качество</option>
            <option value="deadline">Сроки</option>
            <option value="payment">Оплата</option>
            <option value="scope">Объём</option>
            <option value="other">Другое</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Пакет договора (необязательно)
          </label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Не привязан</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.template_code} v{pkg.version}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Связанное изменение (необязательно)
          </label>
          <select
            value={changeOrderId}
            onChange={(e) => setChangeOrderId(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">Не привязан</option>
            {changeOrders.map((co) => (
              <option key={co.id} value={co.id}>
                {co.number} ({co.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? 'Создание...' : 'Открыть претензию'}
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
