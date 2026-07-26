import type { CustomerType, ProjectType } from '@/modules/shared/types';

export type OrderStatus = 'draft' | 'confirmed' | 'closed' | 'cancelled';
export type OrderDocumentType = 'contract' | 'invoice' | 'act';
export type OrderDocumentStatus = 'draft' | 'final' | 'void';
export type DeadlineKind =
  | 'payment'
  | 'production'
  | 'delivery'
  | 'installation'
  | 'act_return'
  | 'custom';

export interface Order {
  id: string;
  organization_id: string;
  order_number: string;
  title: string;
  customer_type: CustomerType;
  customer_display_name: string;
  customer_iin_bin: string | null;
  customer_address: string | null;
  project_type: ProjectType;
  status: OrderStatus;
  currency: 'KZT';
  total_amount_tiyin: string;
  contract_required: boolean;
  source_system: string;
  source_order_id: string | null;
  source_order_version: string | null;
  legacy_legal_case_id: string | null;
  production_due_date: string | null;
  delivery_due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface OrderItem {
  id: string;
  organization_id: string;
  order_id: string;
  position: number;
  name: string;
  quantity: string;
  unit: string;
  unit_price_tiyin: string;
  amount_tiyin: string;
  created_at: string;
}

export interface OrganizationDocumentProfile {
  organization_id: string;
  legal_name: string;
  iin_bin: string;
  address: string;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  iik: string | null;
  bik: string | null;
  kbe: string | null;
  knp: string | null;
  signatory_name: string | null;
  updated_at: string;
  version: number;
}
export interface OrderDocument {
  id: string;
  organization_id: string;
  order_id: string;
  document_type: OrderDocumentType;
  document_number: string;
  status: OrderDocumentStatus;
  version: number;
  amount_tiyin: string | null;
  currency: 'KZT';
  contract_package_id: string | null;
  content_snapshot: Record<string, unknown>;
  content_hash: string | null;
  created_by: string;
  created_at: string;
}

export interface OrderDeadline {
  id: string;
  organization_id: string;
  order_id: string;
  order_document_id: string | null;
  kind: DeadlineKind;
  title: string;
  due_date: string;
  status: 'open' | 'completed' | 'cancelled';
  working_days_offset: number;
  created_by: string;
  created_at: string;
  completed_at: string | null;
}

export interface OrderReminder {
  id: string;
  organization_id: string;
  deadline_id: string;
  remind_on: string;
  status: 'scheduled' | 'completed' | 'dismissed';
  created_at: string;
}
