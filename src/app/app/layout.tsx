import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { AppNav } from './app-nav';

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
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/app" className="app-brand"><span>MD</span><div><b>MebelDocs</b><small>мебельный документооборот</small></div></Link>
        <div className="tenant-chip">Рабочая область · KZ</div>
        <AppNav />
        <div className="furniture-mark" aria-hidden="true"><i/><i/><i/></div>
      </aside>
      <div className="app-frame">
        <header className="app-topbar"><div><small>Рабочая область</small><b>Документы и сроки — вокруг заказа</b></div><Link href="/app/orders/new" className="primary-action">+ Создать заказ</Link></header>
        <main className="app-content">
          <div className="prototype-note"><strong>Пилотный контур.</strong> Договор необязателен; AI/LLM и внешняя отправка отключены.</div>
          {children}
        </main>
      </div>
    </div>
  );
}
