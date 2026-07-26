'use client';

import { useActionState } from 'react';
import type { OrganizationDocumentProfile } from '@/modules/orders/types';
import { saveDocumentProfileAction } from './actions';

const fieldClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export function DocumentProfileForm({ profile }: { profile: OrganizationDocumentProfile | null }) {
  const [state, action, pending] = useActionState(saveDocumentProfileAction, null);
  return (
    <form action={action} className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-800">Полное наименование<input name="legalName" required defaultValue={profile?.legal_name} placeholder="ИП «Мебельная компания»" className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">ИИН / БИН<input name="iinBin" required defaultValue={profile?.iin_bin} inputMode="numeric" className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800 sm:col-span-2">Юридический адрес<input name="address" required defaultValue={profile?.address} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">Телефон<input name="phone" defaultValue={profile?.phone || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">Email<input name="email" type="email" defaultValue={profile?.email || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800 sm:col-span-2">Банк<input name="bankName" defaultValue={profile?.bank_name || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">ИИК / IBAN<input name="iik" defaultValue={profile?.iik || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">БИК<input name="bik" defaultValue={profile?.bik || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">КБе<input name="kbe" defaultValue={profile?.kbe || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800">КНП<input name="knp" defaultValue={profile?.knp || ''} className={fieldClass} /></label>
        <label className="text-sm font-medium text-gray-800 sm:col-span-2">Подписант<input name="signatoryName" defaultValue={profile?.signatory_name || ''} placeholder="ФИО руководителя" className={fieldClass} /></label>
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state?.success && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Реквизиты сохранены и записаны в аудит.</p>}
      <div className="flex justify-end border-t border-gray-200 pt-5">
        <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Сохранение…' : 'Сохранить реквизиты'}</button>
      </div>
    </form>
  );
}
