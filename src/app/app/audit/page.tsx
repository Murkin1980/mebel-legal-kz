import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { auditService } from '@/modules/audit/audit.service';
import { organizationService } from '@/modules/organizations/organization.service';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const organizations = await organizationService.getUserOrganizations(user.id);

  if (organizations.length === 0) {
    redirect('/app');
  }

  const org = organizations[0];

  // Parse filters from search params
  const entityType = typeof params.entityType === 'string' ? params.entityType : undefined;
  const eventType = typeof params.eventType === 'string' ? params.eventType : undefined;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit) : 50;

  const events = await auditService.getOrganizationEvents(org.id, {
    entityType,
    eventType,
    limit,
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Журнал аудита
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Организация: {org.name}
      </p>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-4 text-sm">
            <span className="text-gray-500">Всего событий: {events.length}</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Нет событий аудита
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип события
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сущность
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Command ID
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.occurred_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {event.entity_type}: {event.entity_id.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {event.actor_user_id
                        ? event.actor_user_id.substring(0, 8) + '...'
                        : 'system'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {event.command_id.substring(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
