'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
export default function AcceptInvitePage(){
  const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(event:React.FormEvent){
    event.preventDefault(); setBusy(true); setMessage('');
    if(password.length<10){setMessage('Пароль должен содержать не менее 10 символов');setBusy(false);return;}
    const supabase=createClient(); const {error}=await supabase.auth.updateUser({password});
    if(error){setMessage('Ссылка недействительна или истекла. Запросите новую.');setBusy(false);return;}
    router.push('/app'); router.refresh();
  }
  return <main className="invite-page"><form onSubmit={submit} className="invite-card">
    <span className="brand-mark">MD</span><p className="eyebrow">Приглашение в MebelDocs</p><h1>Установите пароль</h1>
    <p>После сохранения откроется изолированная рабочая область вашей компании.</p>
    <label>Новый пароль<input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e)=>setPassword(e.target.value)}/></label>
    {message&&<p role="alert">{message}</p>}<button className="button button-primary" disabled={busy}>{busy?'Сохранение…':'Принять приглашение'}</button>
  </form></main>;
}
