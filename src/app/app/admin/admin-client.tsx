'use client';
import { useActionState } from 'react';
import { createOrganizationAction, inviteMemberAction } from './actions';

export function AdminClient({ organizationId }: { organizationId?: string }) {
  const [org, createOrg, orgPending] = useActionState(createOrganizationAction, null);
  const [invite, createInvite, invitePending] = useActionState(inviteMemberAction, null);
  return <div className="admin-grid">
    <form action={createOrg} className="workspace-card form-stack">
      <div><span className="app-kicker">Рабочая область</span><h2>Создать компанию</h2></div>
      <label>Название<input name="name" required placeholder="ТОО Мебель Плюс" /></label>
      <label>Код компании<input name="slug" required pattern="[a-z0-9-]+" placeholder="mebel-plus" /></label>
      {org?.error && <p className="form-error">{org.error}</p>}
      {org?.success && <p className="form-success">Компания создана. Обновите страницу.</p>}
      <button className="primary-action" disabled={orgPending}>{orgPending ? 'Создание…' : 'Создать компанию'}</button>
    </form>
    <form action={createInvite} className="workspace-card form-stack">
      <div><span className="app-kicker">Доступ</span><h2>Пригласить участника</h2></div>
      <input type="hidden" name="organizationId" value={organizationId || ''} />
      <label>Email<input name="email" type="email" required disabled={!organizationId} /></label>
      <label>Роль<select name="role" disabled={!organizationId}><option value="manager">Менеджер</option><option value="operations">Производство</option><option value="designer">Дизайнер</option><option value="legal_reviewer">Юрист</option><option value="observer">Наблюдатель</option></select></label>
      {!organizationId && <p className="form-note">Сначала создайте компанию.</p>}
      {invite?.error && <p className="form-error">{invite.error}</p>}
      {invite?.invitationLink && <label>Одноразовая ссылка<textarea readOnly value={invite.invitationLink} rows={4} /></label>}
      <button className="primary-action" disabled={!organizationId || invitePending}>{invitePending ? 'Создание…' : 'Создать приглашение'}</button>
    </form>
  </div>;
}
