'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createCase } from '../actions';

export default function NewCasePage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; caseId?: string } | null, formData: FormData) => {
      const result = await createCase({
        caseNumber: formData.get('caseNumber') as string,
        title: formData.get('title') as string,
        customerType: formData.get('customerType') as string,
        customerDisplayName: formData.get('customerDisplayName') as string,
        projectType: formData.get('projectType') as string,
        totalAmount: formData.get('totalAmount') as string || undefined,
      });

      if (!result.success) {
        return { error: result.error };
      }

      return { caseId: result.data?.caseId };
    },
    null
  );

  if (state?.caseId) {
    router.push(`/app/cases/${state.caseId}`);
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none focus:underline"
        >
          ← Назад к списку
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Создать новый кейс
      </h2>

      <form action={formAction} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <label htmlFor="caseNumber" className="block text-sm font-medium text-gray-700">
            Номер кейса <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="caseNumber"
            name="caseNumber"
            placeholder="LC-000001"
            required
            pattern="LC-\d{6}"
            title="Формат: LC-XXXXXX (6 цифр)"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Формат: LC-XXXXXX (6 цифр)</p>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Название <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            maxLength={500}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="customerType" className="block text-sm font-medium text-gray-700">
            Тип клиента <span className="text-red-500">*</span>
          </label>
          <select
            id="customerType"
            name="customerType"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="legal_entity">Юридическое лицо</option>
            <option value="individual_entrepreneur">ИП</option>
            <option value="individual">Физическое лицо</option>
          </select>
        </div>

        <div>
          <label htmlFor="customerDisplayName" className="block text-sm font-medium text-gray-700">
            Отображаемое имя клиента <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="customerDisplayName"
            name="customerDisplayName"
            required
            maxLength={255}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="projectType" className="block text-sm font-medium text-gray-700">
            Тип проекта <span className="text-red-500">*</span>
          </label>
          <select
            id="projectType"
            name="projectType"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="manufacture_only">Только производство</option>
            <option value="manufacture_delivery">Производство + доставка</option>
            <option value="manufacture_delivery_installation">Производство + доставка + установка</option>
          </select>
        </div>

        <div>
          <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">
            Сумма (₸)
          </label>
          <input
            type="number"
            id="totalAmount"
            name="totalAmount"
            min="0"
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Необязательно. Укажите сумму в тенге.</p>
        </div>

        {state?.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isPending ? 'Создание...' : 'Создать кейс'}
          </button>
        </div>
      </form>
    </div>
  );
}
