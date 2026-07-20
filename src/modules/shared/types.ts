/**
 * Shared types for MebelLegal KZ.
 */

export type UserRole = 'owner' | 'manager' | 'designer' | 'legal_reviewer' | 'observer';

export type MembershipStatus = 'invited' | 'active' | 'disabled';

export type OrganizationStatus = 'active' | 'suspended' | 'archived';

export type CustomerType = 'individual' | 'individual_entrepreneur' | 'legal_entity';

export type ProjectType =
  | 'manufacture_only'
  | 'manufacture_delivery'
  | 'manufacture_delivery_installation';

export type CaseStatus =
  | 'draft'
  | 'data_collection'
  | 'ready_for_review'
  | 'approved'
  | 'suspended'
  | 'closed'
  | 'cancelled';

export type CaseSourceType = 'manual' | 'interactive_kp' | 'import';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country_code: string;
  default_currency: string;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  status: MembershipStatus;
  created_at: string;
}

export interface LegalCase {
  id: string;
  organization_id: string;
  case_number: string;
  title: string;
  customer_type: CustomerType;
  customer_display_name: string;
  project_type: ProjectType;
  status: CaseStatus;
  currency: string;
  total_amount_tiyin: string | null;
  source_type: CaseSourceType;
  source_external_id: string | null;
  source_external_version: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string;
  command_id: string;
  idempotency_key: string | null;
  occurred_at: string;
  payload: Record<string, unknown>;
  previous_event_id: string | null;
  request_correlation_id: string | null;
}

/**
 * Allowed state transitions for legal cases
 */
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ['data_collection', 'cancelled'],
  data_collection: ['draft', 'ready_for_review', 'cancelled'],
  ready_for_review: ['data_collection', 'approved', 'cancelled'],
  approved: ['suspended', 'closed'],
  suspended: ['approved'],
  closed: [],
  cancelled: [],
};

/**
 * Role-based access control matrix
 */
export const ROLE_PERMISSIONS: Record<string, Record<UserRole, boolean>> = {
  view_cases: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
  },
  create_case: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: false,
    observer: false,
  },
  update_case_basics: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: false,
    observer: false,
  },
  transition_to_ready_for_review: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: false,
    observer: false,
  },
  transition_to_approved: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
  },
  close_or_cancel: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: false,
    observer: false,
  },
  manage_members: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: false,
    observer: false,
  },
  view_audit_log: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
  },
};
