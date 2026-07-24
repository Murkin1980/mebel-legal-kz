import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { orderService } from '@/modules/orders/order.service';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждён',
  closed: 'Закрыт',
  cancelled: 'Отменён',
};

function formatMoney(amountTiyin: string) {
  const value = BigInt(amountTiyin);
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${whole.toLocaleString('ru-RU')},${fraction} ₸`;
}
export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const organizations = await organizationService.getUserOrganizations(user.id);
  if (!organizations[0]) redirect('/app');
  const orders = await orderService.listOrders(organizations[0].id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Документооборот</p>
          <h2 className="text-3xl font-semibold tracking-tight text-gray-950">Заказы</h2>
          <p className="mt-1 text-sm text-gray-600">
            Счета, акты, сроки и напоминания работают независимо от договора.
          </p>
        </div>
        <Link
          href="/app/orders/new"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Новый заказ
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h3 className="text-lg font-semibold text-gray-900">Заказов пока нет</h3>
            <p className="mt-2 text-sm text-gray-600">
              Создайте первый заказ, затем добавьте счёт, акт или необязательный договор.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Заказ</th>
                  <th className="px-5 py-3">Клиент</th>
                  <th className="px-5 py-3">Сумма</th>
                  <th className="px-5 py-3">Договор</th>
                  <th className="px-5 py-3">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link href={`/app/orders/${order.id}`} className="font-semibold text-blue-700 hover:underline">
                        {order.order_number}
                      </Link>
                      <div className="mt-1 text-gray-600">{order.title}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-800">{order.customer_display_name}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                      {formatMoney(order.total_amount_tiyin)}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {order.contract_required ? 'Нужен' : 'Необязателен'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
