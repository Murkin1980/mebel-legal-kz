import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MebelDocs — документооборот',
  description: 'Документы и сроки мебельного заказа',
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">MebelDocs</h1>
              <p className="text-xs text-gray-500">Документооборот мебельной компании</p>
            </div>
            <nav className="flex flex-wrap justify-end gap-x-4 gap-y-2 text-sm">
              <Link href="/app/orders" className="font-semibold text-blue-700 hover:text-blue-900">
                Заказы
              </Link>
              <Link href="/app/settings/documents" className="text-gray-600 hover:text-gray-900">
                Реквизиты
              </Link>
              <Link href="/app/cases" className="text-gray-600 hover:text-gray-900">
                Юридические кейсы
              </Link>
              <Link href="/app/templates" className="text-gray-600 hover:text-gray-900">
                Шаблоны
              </Link>
              <Link href="/app/approvals" className="text-gray-600 hover:text-gray-900">
                Юр. согласования
              </Link>
              <Link href="/app/legal/sources" className="text-gray-600 hover:text-gray-900">
                Юр. источники
              </Link>
              <Link href="/app/legal/rules" className="text-gray-600 hover:text-gray-900">
                Юр. правила
              </Link>
              <Link href="/app/audit" className="text-gray-600 hover:text-gray-900">
                Аудит
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            <strong>Рабочий прототип.</strong> Заказ — основной контекст документов. Договор необязателен; юридические функции сохранены как внутренний модуль. AI/LLM и внешняя отправка не подключены.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
