'use client';

import { useRef, useState } from 'react';
import { submitClientDecision } from './actions';

export function ClientApprovalForm({ token }: { token: string }) {
  const commandId = useRef(crypto.randomUUID());
  const [challengeCode, setChallengeCode] = useState('');
  const [comment, setComment] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(decision: 'approved' | 'rejected') {
    setBusy(true);
    setMessage(null);
    const result = await submitClientDecision({ token, challengeCode, decision, comment, clientName, clientEmail, commandId: commandId.current });
    setMessage(result.success ? 'Ваше решение зафиксировано. Повторная отправка ничего не изменит.' : result.error);
    setBusy(false);
  }

  return <div className="space-y-4">
    <label className="block text-sm font-medium">Одноразовый код<input value={challengeCode} onChange={(e) => setChallengeCode(e.target.value.toUpperCase())} maxLength={8} className="mt-1 w-full rounded-md border px-3 py-2 font-mono uppercase" /></label>
    <label className="block text-sm font-medium">Ваше имя<input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
    <label className="block text-sm font-medium">Email (необязательно)<input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label>
    <label className="block text-sm font-medium">Комментарий<textarea value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" rows={3} /></label>
    {message && <p className="rounded-md bg-gray-100 p-3 text-sm">{message}</p>}
    <div className="grid grid-cols-2 gap-3">
      <button disabled={busy || challengeCode.length !== 8} onClick={() => decide('approved')} className="rounded-md bg-green-700 px-4 py-3 font-medium text-white disabled:opacity-50">Согласовать</button>
      <button disabled={busy || challengeCode.length !== 8} onClick={() => decide('rejected')} className="rounded-md bg-red-700 px-4 py-3 font-medium text-white disabled:opacity-50">Отказаться</button>
    </div>
  </div>;
}
