import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { templateService } from '@/modules/templates/template.service';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';
import { TemplateDetail } from './template-detail';

export const dynamic = 'force-dynamic';

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const organizations = await organizationService.getUserOrganizations(user.id);
  if (organizations.length === 0) redirect('/app');

  const org = organizations[0];
  const role = await organizationService.getUserRole(org.id, user.id);
  const { id } = await params;

  let template;
  try {
    template = await templateService.getTemplate(id, org.id);
  } catch {
    redirect('/app/templates');
  }

  const canManage = role ? ROLE_PERMISSIONS.manage_templates[role as UserRole] : false;
  const canPublish = role ? ROLE_PERMISSIONS.publish_template[role as UserRole] : false;

  return (
    <TemplateDetail
      template={{
        id: template.id,
        code: template.code,
        title: template.title,
        customer_type: template.customer_type,
        project_type: template.project_type,
        status: template.status,
        schema: template.schema,
        created_at: template.created_at,
        created_by: template.created_by,
      }}
      canManage={canManage}
      canPublish={canPublish}
    />
  );
}
