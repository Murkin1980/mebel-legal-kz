'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createOrderAction } from '../actions';

const fieldClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export default function NewOrderPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createOrderAction, null);

  useEffect(() => {
    if (state && 'orderId' in state && state.orderId) {
      router.push(`/app/orders/${state.orderId}`);
    }
  }, [router, state]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/orders" className="text-sm font-medium text-blue-700 hover:underline">
        ← Заказы
      </Link>
      <div className="mt-4">
        <p className="text-sm font-semibold text-blue-700">Новый рабочий контур</p>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-950">Новый заказ</h2>
        <p className="mt-1 text-sm text-gray-600">
          Заказ — основа документооборота. Договор можно добавить позже; счёт, акт и сроки
          доступны независимо от него.
        </p>
      </div>

      <form action={formAction} className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-3 text-base font-semibold text-gray-950 sm:col-span-2">Заказ и клиент</legend>
          <label className="text-sm font-medium text-gray-800">
            Номер заказа
            <input name="orderNumber" required placeholder="ORD-000001" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Название
            <input name="title" required placeholder="Кухня на заказ" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Клиент
            <input name="customerDisplayName" required placeholder="Иванов Иван" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Тип клиента
            <select name="customerType" className={fieldClass}>
              <option value="individual">Физическое лицо</option>
              <option value="individual_entrepreneur">ИП</option>
              <option value="legal_entity">Юридическое лицо</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-800">
            ИИН / БИН клиента
            <input name="customerIinBin" inputMode="numeric" placeholder="Необязательно" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Тип работ
            <select name="projectType" className={fieldClass}>
              <option value="manufacture_only">Изготовление</option>
              <option value="manufacture_delivery">Изготовление и доставка</option>
              <option value="manufacture_delivery_installation">Изготовление, доставка и монтаж</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-800 sm:col-span-2">
            Адрес клиента
            <input name="customerAddress" placeholder="Город, улица, дом" className={fieldClass} />
          </label>
        </fieldset>

        <fieldset className="grid gap-5 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
          <legend className="px-2 text-sm font-semibold text-gray-900">Позиция заказа</legend>
          <label className="text-sm font-medium text-gray-800 sm:col-span-4">
            Наименование
            <input name="itemName" required placeholder="Кухонный гарнитур по индивидуальному проекту" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Количество
            <input name="itemQuantity" required inputMode="decimal" defaultValue="1" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Ед. изм.
            <input name="itemUnit" required defaultValue="компл." className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800 sm:col-span-2">
            Цена за единицу, ₸
            <input name="itemUnitPrice" required inputMode="decimal" defaultValue="0" className={fieldClass} />
          </label>
          <p className="text-xs text-gray-500 sm:col-span-4">
            Итог рассчитывается на сервере из количества и цены и сохраняется в тиынах.
          </p>
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-3 text-base font-semibold text-gray-950 sm:col-span-2">Сроки</legend>
          <label className="text-sm font-medium text-gray-800">
            Срок изготовления
            <input type="date" name="productionDueDate" className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-800">
            Срок доставки
            <input type="date" name="deliveryDueDate" className={fieldClass} />
          </label>
        </fieldset>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
          <input type="checkbox" name="contractRequired" className="mt-0.5 size-4" />
          <span>
            <strong className="block">Для заказа нужен договор</strong>
            Если не отмечать, счёт, акт и сроки всё равно доступны.
          </span>
        </label>

        {state?.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
          <Link href="/app/orders" className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700">
            Отмена
          </Link>
          <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? 'Создание…' : 'Создать заказ'}
          </button>
        </div>
      </form>
    </div>
  );
}
