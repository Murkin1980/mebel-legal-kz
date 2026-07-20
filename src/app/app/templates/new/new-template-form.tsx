'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createContractTemplate } from '../actions';

const CUSTOMER_TYPES = [
  { value: 'individual', label: 'Физ. лицо' },
  { value: 'individual_entrepreneur', label: 'ИП' },
  { value: 'legal_entity', label: 'Юр. лицо' },
];

const PROJECT_TYPES = [
  { value: 'manufacture_only', label: 'Только производство' },
  { value: 'manufacture_delivery', label: 'Производство + доставка' },
  { value: 'manufacture_delivery_installation', label: 'Производство + доставка + монтаж' },
];

export function NewTemplateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    title: '',
    customerType: 'individual',
    projectType: 'manufacture_only',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createContractTemplate({
        code: form.code,
        title: form.title,
        customerType: form.customerType,
        projectType: form.projectType,
      });

      if (result.success && result.data) {
        router.push(`/app/templates/${result.data.templateId}`);
      } else {
        setError(result.error || 'Ошибка при создании шаблона');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/app/templates" className="text-sm text-blue-600 hover:underline">← Шаблоны</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Новый шаблон договора</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Код</label>
            <input
              type="text"
              required
              pattern="[A-Z0-9_]+"
              value={form.code}
              onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="DOG_001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Договор на мебель"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип клиента</label>
            <select
              value={form.customerType}
              onChange={(e) => setForm(f => ({ ...f, customerType: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {CUSTOMER_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип проекта</label>
            <select
              value={form.projectType}
              onChange={(e) => setForm(f => ({ ...f, projectType: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {PROJECT_TYPES.map(pt => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать шаблон'}
          </button>
          <Link
            href="/app/templates"
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
