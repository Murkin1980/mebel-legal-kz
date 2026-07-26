'use client';
import {useActionState,useState} from 'react';
import {createOrganizationAction,inviteMemberAction,manageMemberAction} from './actions';

type Member={id:string;userId:string;email:string;role:string;status:string;createdAt:string};
const roles=[['owner','Владелец'],['manager','Менеджер'],['designer','Дизайнер'],['legal_reviewer','Юрист'],['observer','Наблюдатель']];
const statusLabel:Record<string,string>={active:'Активен',invited:'Приглашён',disabled:'Отключён'};

function MemberRow({member,organizationId}:{member:Member;organizationId:string}){
 const[state,action,pending]=useActionState(manageMemberAction,null);
 return <form action={action} className="member-row">
  <input type="hidden" name="organizationId" value={organizationId}/><input type="hidden" name="membershipId" value={member.id}/>
  <div className="member-person"><b>{member.email}</b><small>ID: {member.userId.slice(0,8)} · добавлен {new Date(member.createdAt).toLocaleDateString('ru-RU')}</small></div>
  <span className={`member-status ${member.status}`}>{statusLabel[member.status]||member.status}</span>
  <select name="role" defaultValue={member.role} aria-label={`Роль ${member.email}`} disabled={pending||member.status==='disabled'}>{roles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
  <button name="action" value="change_role" disabled={pending||member.status==='disabled'}>Сохранить роль</button>
  {member.status==='disabled'?<button name="action" value="restore" className="member-restore" disabled={pending}>Восстановить</button>:<button name="action" value="disable" className="member-disable" disabled={pending}>Отключить</button>}
  {state?.error&&<p role="alert" className="form-error member-message">{state.error}</p>}
  {state?.success&&<p role="status" className="form-success member-message">Изменение сохранено</p>}
 </form>
}

export function AdminClient({organizationId,members}:{organizationId?:string;members:Member[]}){
 const[org,createOrg,orgPending]=useActionState(createOrganizationAction,null);
 const[invite,createInvite,invitePending]=useActionState(inviteMemberAction,null);
 const[copied,setCopied]=useState(false);
 async function copyLink(){if(invite?.invitationLink){await navigator.clipboard.writeText(invite.invitationLink);setCopied(true)}}
 return <div className="admin-stack">
  {!organizationId&&<form action={createOrg} className="workspace-card form-stack"><div><span className="app-kicker">Рабочая область</span><h2>Создать компанию</h2></div><label>Название<input name="name" required placeholder="ТОО Мебель Плюс"/></label><label>Код компании<input name="slug" required pattern="[a-z0-9-]+" placeholder="mebel-plus"/></label>{org?.error&&<p className="form-error">{org.error}</p>}{org?.success&&<p className="form-success">Компания создана. Обновите страницу.</p>}<button className="primary-action" disabled={orgPending}>{orgPending?'Создание…':'Создать компанию'}</button></form>}
  {organizationId&&<section className="workspace-card"><div className="member-heading"><div><span className="app-kicker">Команда</span><h2>Участники и роли</h2><p>Доступ изменяется сразу и фиксируется в журнале действий.</p></div><span className="member-count">{members.length} участников</span></div><div className="member-list">{members.map(member=><MemberRow key={member.id} member={member} organizationId={organizationId}/>)}</div></section>}
  <form action={createInvite} className="workspace-card form-stack"><div><span className="app-kicker">Новое приглашение</span><h2>Пригласить участника</h2><p className="form-note">Ссылка одноразовая. Повторная отправка создаёт новую ссылку для того же email.</p></div><input type="hidden" name="organizationId" value={organizationId||''}/><label>Email<input name="email" type="email" required disabled={!organizationId}/></label><label>Роль<select name="role" disabled={!organizationId}>{roles.filter(([value])=>value!=='owner').map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{!organizationId&&<p className="form-note">Сначала создайте компанию.</p>}{invite?.error&&<p className="form-error">{invite.error}</p>}{invite?.invitationLink&&<div className="invite-result"><label>Одноразовая ссылка<textarea readOnly value={invite.invitationLink} rows={3}/></label><button type="button" onClick={copyLink}>{copied?'Скопировано':'Копировать ссылку'}</button></div>}<button className="primary-action" disabled={!organizationId||invitePending}>{invitePending?'Создание…':'Создать приглашение'}</button></form>
 </div>
}
