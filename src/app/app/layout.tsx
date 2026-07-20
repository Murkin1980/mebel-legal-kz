import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MebelLegal KZ - Приложение',
  description: 'Правовой контур для мебельного бизнеса',
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
            <h1 className="text-xl font-semibold text-gray-900">
              MebelLegal KZ
            </h1>
            <nav className="flex space-x-4">
              <Link href="/app/cases" className="text-gray-600 hover:text-gray-900">
                Кейсы
              </Link>
              <Link href="/app/legal/sources" className="text-gray-600 hover:text-gray-900">
                Источники
              </Link>
              <Link href="/app/legal/rules" className="text-gray-600 hover:text-gray-900">
                Правила
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
            <strong>Этап 2.</strong> Реестр правовых источников. Источники добавляются вручную. AI/LLM не подключены.
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
