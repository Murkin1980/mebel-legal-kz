import { notFound } from 'next/navigation';
import { publicApprovalService } from '@/modules/approvals/public-approval.service';
import { ClientApprovalForm } from './approval-form';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' as const };

export default async function ClientApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let view;
  try { view = await publicApprovalService.getPublicView(token); } catch { notFound(); }
  const decided = view.decisions.length > 0;
  return <main className="min-h-screen bg-gray-50 px-4 py-12"><div className="mx-auto max-w-lg rounded-xl bg-white p-6 shadow">
    <h1 className="text-2xl font-bold">Согласование версии договора</h1>
    <p className="mt-2 text-sm text-gray-600">Пакет {view.package.template_code}, версия {view.package.version}. Содержимое договора по этой ссылке не раскрывается.</p>
    {decided ? <p className="mt-6 rounded-md bg-green-50 p-4 text-green-800">Решение уже зафиксировано.</p> : <div className="mt-6"><ClientApprovalForm token={token} /></div>}
    <p className="mt-6 text-xs text-gray-500">Если вы не ожидали это приглашение, закройте страницу и свяжитесь с отправителем.</p>
  </div></main>;
}
