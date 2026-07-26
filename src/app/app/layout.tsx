import type{Metadata}from'next';import'./globals.css';import{AppShell}from'./app-shell';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'MebelDocs — документооборот',description:'Документы и сроки мебельного заказа'};
export default function AppLayout({children}:{children:React.ReactNode}){return <AppShell>{children}</AppShell>}
