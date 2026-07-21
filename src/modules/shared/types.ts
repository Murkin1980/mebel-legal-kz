/**
 * Shared types for MebelLegal KZ.
 */

export type UserRole = 'owner' | 'manager' | 'designer' | 'legal_reviewer' | 'operations' | 'observer';

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

// Stage 2: Legal Sources & Rules
export type LegalSourceStatus = 'draft' | 'approved' | 'deprecated';
export type SourceSystem = 'adilet' | 'internal' | 'other';
export type LegalSourceRevisionStatus = 'draft' | 'under_review' | 'approved' | 'retired';
export type LegalRuleStatus = 'draft' | 'under_review' | 'approved' | 'retired';

// Stage 3: Contract Templates & Packages
export type ContractTemplateStatus = 'draft' | 'expert_review' | 'published' | 'retired';
export type ContractPackageStatus =
  | 'draft'
  | 'under_review'
  | 'approved_for_internal_use'
  | 'published_for_consultation'
  | 'retired';

// Stage 4: Contract Approvals
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'revoked';

// Stage 5: Change Orders
export type ChangeOrderStatus = 'draft' | 'requested' | 'approved' | 'rejected' | 'applied' | 'cancelled';
export type ChangeType = 'scope' | 'price' | 'deadline' | 'terms' | 'other';

// Stage 5: Claims
export type ClaimStatus = 'open' | 'in_review' | 'resolved' | 'withdrawn';
export type ClaimType = 'quality' | 'deadline' | 'payment' | 'scope' | 'other';

// Stage 6: Contract Execution Phases
export type ExecutionPhaseName =
  | 'drafting'
  | 'internal_review'
  | 'client_negotiation'
  | 'signed'
  | 'in_production'
  | 'delivered'
  | 'archived';

export type ExecutionPhaseStatus = 'active' | 'on_hold' | 'closed';

export type CheckpointStatus = 'pending' | 'in_progress' | 'completed' | 'reopened';

export type CheckpointAssignedRole = 'owner' | 'manager' | 'legal_reviewer' | 'operations';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

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

// Stage 2: Legal Source
export interface LegalSource {
  id: string;
  organization_id: string;
  canonical_url: string;
  title: string;
  source_system: SourceSystem;
  status: LegalSourceStatus;
  is_allowed: boolean;
  created_at: string;
  created_by: string;
}

// Stage 2: Legal Source Revision
export interface LegalSourceRevision {
  id: string;
  source_id: string;
  revision_number: number;
  effective_from: string | null;
  effective_to: string | null;
  fetched_at: string;
  fetched_by: string;
  content_hash: string;
  status: LegalSourceRevisionStatus;
  metadata: Record<string, unknown>;
}

// Stage 2: Legal Rule
export interface LegalRule {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string;
  source_revision_id: string;
  status: LegalRuleStatus;
  logic: Record<string, unknown>;
  created_at: string;
  created_by: string;
}

// Stage 3: Contract Template
export interface ContractTemplate {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  customer_type: CustomerType;
  project_type: ProjectType;
  status: ContractTemplateStatus;
  schema: Record<string, unknown>;
  created_at: string;
  created_by: string;
}

// Stage 3: Contract Package
export interface ContractPackage {
  id: string;
  legal_case_id: string;
  template_code: string;
  version: number;
  status: ContractPackageStatus;
  content_snapshot: Record<string, unknown>;
  source_revision_ids: string[];
  created_at: string;
  created_by: string;
}

// Stage 4: Contract Approval
export interface ContractApproval {
  id: string;
  organization_id: string;
  legal_case_id: string;
  contract_package_id: string;
  status: ApprovalStatus;
  requested_by: string;
  decided_by: string | null;
  decided_at: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
}

// Stage 5: Change Order
export interface ChangeOrder {
  id: string;
  organization_id: string;
  legal_case_id: string;
  contract_package_id: string;
  number: string;
  status: ChangeOrderStatus;
  change_type: ChangeType;
  delta_amount: string;
  reason: string;
  created_at: string;
  created_by: string;
  applied_at: string | null;
  metadata: Record<string, unknown>;
}

// Stage 5: Claim
export interface Claim {
  id: string;
  organization_id: string;
  legal_case_id: string;
  contract_package_id: string | null;
  change_order_id: string | null;
  type: ClaimType;
  status: ClaimStatus;
  opened_at: string;
  opened_by: string;
  resolved_at: string | null;
  resolution_summary: string | null;
  resolution_rule_ids: string[] | null;
  metadata: Record<string, unknown>;
}

// Stage 6: Contract Execution Phase
export interface ContractExecutionPhase {
  id: string;
  organization_id: string;
  legal_case_id: string;
  contract_package_id: string;
  current_phase: ExecutionPhaseName;
  status: ExecutionPhaseStatus;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  metadata: Record<string, unknown>;
}

// Stage 6: Execution Checkpoint
export interface ExecutionCheckpoint {
  id: string;
  organization_id: string;
  execution_phase_id: string;
  name: string;
  description: string | null;
  status: CheckpointStatus;
  assigned_role: CheckpointAssignedRole | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  completed_at: string | null;
  completed_by: string | null;
  metadata: Record<string, unknown>;
}

// Stage 6: Execution Payments Summary
export interface ExecutionPaymentsSummary {
  id: string;
  organization_id: string;
  legal_case_id: string;
  contract_package_id: string;
  total_amount: string;
  paid_amount: string;
  status: PaymentStatus;
  last_payment_at: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  metadata: Record<string, unknown>;
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
 * Allowed state transitions for legal sources
 */
export const LEGAL_SOURCE_TRANSITIONS: Record<LegalSourceStatus, LegalSourceStatus[]> = {
  draft: ['approved'],
  approved: ['deprecated'],
  deprecated: [],
};

/**
 * Allowed state transitions for legal source revisions
 */
export const REVISION_TRANSITIONS: Record<LegalSourceRevisionStatus, LegalSourceRevisionStatus[]> = {
  draft: ['under_review'],
  under_review: ['approved'],
  approved: ['retired'],
  retired: [],
};

/**
 * Allowed state transitions for legal rules
 */
export const LEGAL_RULE_TRANSITIONS: Record<LegalRuleStatus, LegalRuleStatus[]> = {
  draft: ['under_review'],
  under_review: ['approved'],
  approved: ['retired'],
  retired: [],
};

/**
 * Allowed state transitions for contract templates
 */
export const TEMPLATE_TRANSITIONS: Record<ContractTemplateStatus, ContractTemplateStatus[]> = {
  draft: ['expert_review', 'retired'],
  expert_review: ['published', 'retired'],
  published: ['retired'],
  retired: [],
};

/**
 * Allowed state transitions for contract packages
 */
export const PACKAGE_TRANSITIONS: Record<ContractPackageStatus, ContractPackageStatus[]> = {
  draft: ['under_review', 'retired'],
  under_review: ['approved_for_internal_use', 'retired'],
  approved_for_internal_use: ['published_for_consultation', 'retired'],
  published_for_consultation: ['retired'],
  retired: [],
};

/**
 * Allowed state transitions for contract approvals
 */
export const APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  draft: ['pending_review', 'revoked'],
  pending_review: ['approved', 'rejected', 'revoked'],
  approved: [],
  rejected: [],
  revoked: [],
};

/**
 * Allowed state transitions for change orders
 */
export const CHANGE_ORDER_TRANSITIONS: Record<ChangeOrderStatus, ChangeOrderStatus[]> = {
  draft: ['requested', 'cancelled'],
  requested: ['approved', 'rejected'],
  approved: ['applied', 'cancelled'],
  rejected: [],
  applied: [],
  cancelled: [],
};

/**
 * Allowed state transitions for claims
 */
export const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  open: ['in_review', 'withdrawn'],
  in_review: ['resolved', 'withdrawn'],
  resolved: [],
  withdrawn: [],
};

/**
 * Allowed state transitions for contract execution phases
 */
export const EXECUTION_PHASE_TRANSITIONS: Record<ExecutionPhaseName, ExecutionPhaseName[]> = {
  drafting: ['internal_review', 'archived'],
  internal_review: ['drafting', 'client_negotiation', 'archived'],
  client_negotiation: ['drafting', 'internal_review', 'signed', 'archived'],
  signed: ['in_production', 'archived'],
  in_production: ['delivered', 'archived'],
  delivered: ['archived'],
  archived: [],
};

/**
 * Allowed checkpoint status transitions
 */
export const CHECKPOINT_TRANSITIONS: Record<CheckpointStatus, CheckpointStatus[]> = {
  pending: ['in_progress', 'completed'],
  in_progress: ['completed', 'reopened'],
  completed: ['reopened'],
  reopened: ['in_progress', 'completed'],
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
    operations: false,
  },
  create_case: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  update_case_basics: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  transition_to_ready_for_review: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  transition_to_approved: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  close_or_cancel: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  manage_members: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  view_audit_log: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  // Stage 2: Legal Sources & Rules permissions
  manage_legal_sources: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  approve_legal_source_revision: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  approve_legal_rule: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  view_legal_sources: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  view_legal_rules: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  // Stage 3: Contract Templates & Packages permissions
  manage_templates: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  publish_template: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  view_templates: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  manage_packages: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  approve_package: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  publish_package: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  view_packages: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  // Stage 4: Contract Approvals permissions
  manage_approvals: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  decide_approvals: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  view_approvals: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  // Stage 5: Change Orders permissions
  manage_changes: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  approve_changes: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  apply_changes: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: false,
    observer: false,
    operations: false,
  },
  view_changes: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  // Stage 5: Claims permissions
  manage_claims: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  resolve_claims: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    observer: false,
    operations: false,
  },
  view_claims: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    observer: true,
    operations: false,
  },
  // Stage 6: Execution Phase permissions
  view_execution: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    operations: true,
    observer: true,
  },
  manage_execution_phase: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: false,
    operations: true,
    observer: false,
  },
  approve_execution_transition: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: true,
    operations: false,
    observer: false,
  },
  manage_checkpoints: {
    owner: true,
    manager: true,
    designer: false,
    legal_reviewer: true,
    operations: true,
    observer: false,
  },
  view_checkpoints: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    operations: true,
    observer: true,
  },
  manage_payments_summary: {
    owner: true,
    manager: false,
    designer: false,
    legal_reviewer: false,
    operations: true,
    observer: false,
  },
  view_payments_summary: {
    owner: true,
    manager: true,
    designer: true,
    legal_reviewer: true,
    operations: true,
    observer: true,
  },
};
