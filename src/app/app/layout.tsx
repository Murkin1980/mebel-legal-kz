import type {Metadata} from 'next';
import './globals.css';
import {AppShell} from './app-shell';
import {createClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'MebelDocs — документооборот',description:'Документы и сроки мебельного заказа'};

export default async function AppLayout({children}:{children:React.ReactNode}){
 const supabase=await createClient();
 const{data:{user}}=await supabase.auth.getUser();
 const{data:owner}=user
  ?await supabase.from('organization_memberships').select('id').eq('user_id',user.id).eq('role','owner').eq('status','active').limit(1).maybeSingle()
  :{data:null};
 return <AppShell showAdmin={Boolean(owner)}>{children}</AppShell>;
}
