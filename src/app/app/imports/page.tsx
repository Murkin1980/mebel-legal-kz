import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ImportClient } from './import-client';
export default async function ImportsPage(){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/login');
  return <section className="page-stack"><header className="workspace-heading"><div><span className="app-kicker">Миграция данных</span><h1>Импорт бухгалтерского архива</h1><p>Сначала проверка структуры, затем явное подтверждение и запись с аудитом.</p></div></header><ImportClient/></section>;
}
