import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { organizationService } from '@/modules/organizations/organization.service';
import { orderService } from '@/modules/orders/order.service';
import { OrderWorkspace } from './workspace';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const organizations = await organizationService.getUserOrganizations(user.id);
  if (!organizations[0]) redirect('/app');
  const workspace = await orderService.getOrderWorkspace(organizations[0].id, id);
  return <OrderWorkspace {...workspace} />;
}
