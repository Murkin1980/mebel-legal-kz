'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Order, OrderDeadline, OrderDocument, OrderReminder, OrderDocumentType, DeadlineKind } from '@/modules/orders/types';
import { createOrderDeadlineAction, createOrderDocumentAction } from '../actions';

const DOCUMENT_LABELS: Record<OrderDocumentType, string> = {
  contract: 'Договор',
  invoice: 'Счёт',
  act: 'Акт',
};

function formatMoney(value: string | null) {
  if (value === null) return '—';
  const amount = BigInt(value);
  return `${(amount / 100n).toLocaleString('ru-RU')},${(amount % 100n).toString().padStart(2, '0')} ₸`;
}

export function OrderWorkspace({
  order,
  documents,
  deadlines,
  reminders,
}: {
  order: Order;
  documents: OrderDocument[];
  deadlines: OrderDeadline[];
  reminders: OrderReminder[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createDocument(documentType: OrderDocumentType) {
    setBusy(true);
    setMessage(null);
    const prefix = documentType === 'invoice' ? 'INV' : documentType === 'act' ? 'ACT' : 'CTR';
    const result = await createOrderDocumentAction({
      orderId: order.id,
      documentType,
      documentNumber: `${prefix}-${order.order_number}`,
    });
    setBusy(false);
    setMessage(result.success ? `${DOCUMENT_LABELS[documentType]} создан как черновик` : result.error || 'Ошибка');
    if (result.success) router.refresh();
  }

  async function addDeadline(formData: FormData) {
    setBusy(true);
    setMessage(null);
    const result = await createOrderDeadlineAction({
      orderId: order.id,
      kind: String(formData.get('kind')) as DeadlineKind,
      title: String(formData.get('title')),
      dueDate: String(formData.get('dueDate')),
      workingDaysOffset: Number(formData.get('workingDaysOffset') || 0),
    });
    setBusy(false);
    setMessage(result.success ? `Срок создан, рассчитано напоминаний: ${result.reminderCount}` : result.error || 'Ошибка');
    if (result.success) router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link href="/app/orders" className="text-sm font-medium text-blue-700 hover:underline">← Заказы</Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-700">{order.order_number}</p>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-950">{order.title}</h2>
          <p className="mt-1 text-sm text-gray-600">{order.customer_display_name}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-right shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Сумма заказа</div>
          <div className="mt-1 text-2xl font-semibold text-gray-950">{formatMoney(order.total_amount_tiyin)}</div>
          <div className="mt-1 text-sm text-gray-600">
            Договор: {order.contract_required ? 'нужен' : 'необязателен'}
          </div>
        </div>
      </div>

      {message && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</div>}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-950">Документы заказа</h3>
            <p className="text-sm text-gray-600">Прототип создаёт версионные структуры; экспорт файлов — следующий этап.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => createDocument('invoice')} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Создать счёт</button>
            <button disabled={busy} onClick={() => createDocument('act')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Создать акт</button>
            <button disabled={busy} onClick={() => createDocument('contract')} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50">Добавить договор</button>
          </div>
        </div>
        <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {documents.length === 0 ? (
            <p className="p-5 text-sm text-gray-600">Документов пока нет.</p>
          ) : documents.map((document) => (
            <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <span className="font-semibold text-gray-900">{DOCUMENT_LABELS[document.document_type]}</span>
                <span className="ml-2 text-gray-600">{document.document_number} · v{document.version}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-700">{formatMoney(document.amount_tiyin)}</span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{document.status}</span>
                {(document.document_type === 'invoice' || document.document_type === 'act') && (
                  <a
                    href={`/app/orders/${order.id}/documents/${document.id}/export`}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Скачать черновик
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-950">Сроки и напоминания</h3>
          <div className="mt-4 space-y-3">
            {deadlines.length === 0 ? <p className="text-sm text-gray-600">Сроков пока нет.</p> : deadlines.map((deadline) => {
              const count = reminders.filter((item) => item.deadline_id === deadline.id).length;
              return (
                <div key={deadline.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">{deadline.title}</div>
                      <div className="mt-1 text-sm text-gray-600">{deadline.kind} · {count} напоминания</div>
                    </div>
                    <time className="whitespace-nowrap text-sm font-semibold text-gray-900">{new Date(`${deadline.due_date}T00:00:00Z`).toLocaleDateString('ru-RU')}</time>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <form action={addDeadline} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-950">Добавить срок</h3>
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-gray-800">Название<input name="title" required placeholder="Оплатить счёт" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium text-gray-800">Тип<select name="kind" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5"><option value="payment">Оплата</option><option value="production">Изготовление</option><option value="delivery">Доставка</option><option value="installation">Монтаж</option><option value="act_return">Возврат акта</option><option value="custom">Другой</option></select></label>
            <label className="block text-sm font-medium text-gray-800">Дата<input name="dueDate" type="date" required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium text-gray-800">Рабочих дней по правилу<input name="workingDaysOffset" type="number" min="0" max="365" defaultValue="0" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
            <p className="text-xs text-gray-500">Напоминания рассчитываются за 7, 3 и 1 рабочий день, а также в день срока.</p>
            <button disabled={busy} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Добавить срок</button>
          </div>
        </form>
      </div>
    </div>
  );
}
