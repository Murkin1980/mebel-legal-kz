import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { caseService } from '@/modules/cases/case.service';
import type { CaseStatus } from '@/modules/shared/types';
import { CASE_TRANSITIONS } from '@/modules/shared/types';

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Черновик',
  data_collection: 'Сбор данных',
  ready_for_review: 'На проверке',
  approved: 'Утверждён',
  suspended: 'Приостановлен',
  closed: 'Закрыт',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  data_collection: 'bg-blue-100 text-blue-800',
  ready_for_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  suspended: 'bg-orange-100 text-orange-800',
  closed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: 'Физическое лицо',
  individual_entrepreneur: 'ИП',
  legal_entity: 'Юридическое лицо',
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  manufacture_only: 'Только производство',
  manufacture_delivery: 'Производство + доставка',
  manufacture_delivery_installation: 'Производство + доставка + установка',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    redirect('/app');
  }

  const legalCase = await caseService.getCase(id, membership.organization_id);
  const allowedTransitions = CASE_TRANSITIONS[legalCase.status as CaseStatus];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/app/cases" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Назад к списку
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {legalCase.case_number}
            </h2>
            <p className="text-gray-600 mt-1">{legalCase.title}</p>
          </div>
          <span
            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${STATUS_COLORS[legalCase.status as CaseStatus]}`}
          >
            {STATUS_LABELS[legalCase.status as CaseStatus]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Информация о клиенте
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Тип</dt>
                <dd className="text-sm text-gray-900">
                  {CUSTOMER_TYPE_LABELS[legalCase.customer_type]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Имя</dt>
                <dd className="text-sm text-gray-900">
                  {legalCase.customer_display_name}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Проект
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Тип проекта</dt>
                <dd className="text-sm text-gray-900">
                  {PROJECT_TYPE_LABELS[legalCase.project_type]}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Сумма</dt>
                <dd className="text-sm text-gray-900">
                  {legalCase.total_amount_tiyin
                    ? `${(Number(legalCase.total_amount_tiyin) / 100).toLocaleString('ru-RU')} ₸`
                    : 'Не указана'}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Метаданные
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Валюта</dt>
                <dd className="text-sm text-gray-900">{legalCase.currency}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Версия</dt>
                <dd className="text-sm text-gray-900">{legalCase.version}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Источник</dt>
                <dd className="text-sm text-gray-900">{legalCase.source_type}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Даты
            </h3>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Создан</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(legalCase.created_at).toLocaleString('ru-RU')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Обновлён</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(legalCase.updated_at).toLocaleString('ru-RU')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {allowedTransitions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Доступные переходы
            </h3>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((status) => (
                <form key={status} action={`/api/cases/${legalCase.id}/transition`} method="POST">
                  <input type="hidden" name="targetStatus" value={status} />
                  <input type="hidden" name="version" value={legalCase.version} />
                  <button
                    type="submit"
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      status === 'cancelled'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    → {STATUS_LABELS[status]}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Примечание:</strong> Статус «Утверждён» означает только внутреннее утверждение карточки кейса.
            Он <strong>не означает</strong>, что договор юридически проверен, сформирован или подписан.
          </p>
        </div>
      </div>
    </div>
  );
}
