'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const links=[['/app/orders','Заказы','orders'],['/app/imports','Импорт','import'],['/app/settings/documents','Реквизиты','settings'],['/app/cases','MebelLegal','legal'],['/app/audit','Аудит','audit'],['/app/admin','Админка','admin']] as const;
export function AppNav(){
  const path=usePathname();
  return <nav className="side-nav">{links.map(([href,label,tone])=><Link key={href} href={href} className={`${path.startsWith(href)?'active ':''}${tone}`}><i aria-hidden="true"/><span>{label}</span>{tone==='legal'&&<small>внутренний модуль</small>}</Link>)}</nav>;
}
