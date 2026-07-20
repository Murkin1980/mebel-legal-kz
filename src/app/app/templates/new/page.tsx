import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';
import { NewTemplateForm } from './new-template-form';

export const dynamic = 'force-dynamic';

export default async function NewTemplatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);

  const canManage = role ? ROLE_PERMISSIONS.manage_templates[role as UserRole] : false;
  if (!canManage) redirect('/app/templates');

  return <NewTemplateForm />;
}
