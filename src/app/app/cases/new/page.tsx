'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Organization } from '@/modules/shared/types';

export default function NewCasePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [caseNumber, setCaseNumber] = useState('');
  const [title, setTitle] = useState('');
  const [customerType, setCustomerType] = useState<string>('legal_entity');
  const [customerDisplayName, setCustomerDisplayName] = useState('');
  const [projectType, setProjectType] = useState<string>('manufacture_only');
  const [totalAmount, setTotalAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: memberships } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!memberships || memberships.length === 0) {
        setError('У вас нет доступных организаций');
        return;
      }

      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      setOrganizations(orgs || []);
      if (orgs && orgs.length > 0) {
        setSelectedOrg(orgs[0].id);
      }
    };

    fetchOrganizations();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    // Convert amount from tenge to tyins
    const totalAmountTiyin = totalAmount
      ? String(Math.round(parseFloat(totalAmount) * 100))
      : null;

    const { data, error: insertError } = await supabase
      .from('legal_cases')
      .insert({
        organization_id: selectedOrg,
        case_number: caseNumber,
        title,
        customer_type: customerType,
        customer_display_name: customerDisplayName,
        project_type: projectType,
        total_amount_tiyin: totalAmountTiyin,
        created_by: user.id,
        status: 'draft',
        version: 1,
      })
      .select()
      .single();

    if (insertError) {
      setError('Ошибка создания кейса: ' + insertError.message);
      setLoading(false);
      return;
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: selectedOrg,
      actor_user_id: user.id,
      event_type: 'case.created',
      entity_type: 'legal_case',
      entity_id: data.id,
      command_id: crypto.randomUUID(),
      payload: {
        case_number: caseNumber,
        title,
        customer_type: customerType,
        status: 'draft',
      },
    });

    router.push(`/app/cases/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Создать новый кейс
      </h2>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {organizations.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Организация
            </label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Номер кейса
          </label>
          <input
            type="text"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="LC-000001"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Название
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Тип клиента
          </label>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="individual">Физическое лицо</option>
            <option value="individual_entrepreneur">ИП</option>
            <option value="legal_entity">Юридическое лицо</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Отображаемое имя клиента
          </label>
          <input
            type="text"
            value={customerDisplayName}
            onChange={(e) => setCustomerDisplayName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Тип проекта
          </label>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="manufacture_only">Только производство</option>
            <option value="manufacture_delivery">Производство + доставка</option>
            <option value="manufacture_delivery_installation">Производство + доставка + установка</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Сумма (₸)
          </label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            min="0"
            step="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Создание...' : 'Создать кейс'}
          </button>
        </div>
      </form>
    </div>
  );
}
