/**
 * Zod validation schemas for MebelLegal KZ.
 *
 * Used at command boundaries to validate all input.
 */

import { z } from 'zod';

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(UUID_REGEX, 'Invalid UUID');

export const currencySchema = z.literal('KZT');

export const customerTypeSchema = z.enum([
  'individual',
  'individual_entrepreneur',
  'legal_entity',
]);

export const projectTypeSchema = z.enum([
  'manufacture_only',
  'manufacture_delivery',
  'manufacture_delivery_installation',
]);

export const caseStatusSchema = z.enum([
  'draft',
  'data_collection',
  'ready_for_review',
  'approved',
  'suspended',
  'closed',
  'cancelled',
]);

export const userRoleSchema = z.enum([
  'owner',
  'manager',
  'designer',
  'legal_reviewer',
  'observer',
]);

export const caseSourceTypeSchema = z.enum(['manual', 'interactive_kp', 'import']);

// Stage 2: Legal Source & Rule enums
export const legalSourceStatusSchema = z.enum(['draft', 'approved', 'deprecated']);
export const sourceSystemSchema = z.enum(['adilet', 'internal', 'other']);
export const legalSourceRevisionStatusSchema = z.enum(['draft', 'under_review', 'approved', 'retired']);
export const legalRuleStatusSchema = z.enum(['draft', 'under_review', 'approved', 'retired']);

// Create Organization command
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  countryCode: z.string().length(2).default('KZ'),
  defaultCurrency: currencySchema.default('KZT'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

// Add Organization Member command
export const addOrganizationMemberSchema = z.object({
  organizationId: uuidSchema,
  userId: uuidSchema,
  role: userRoleSchema,
});

export type AddOrganizationMemberInput = z.infer<typeof addOrganizationMemberSchema>;

// Create Legal Case command
export const createLegalCaseSchema = z.object({
  caseNumber: z.string().min(1).max(50),
  title: z.string().min(1).max(500),
  customerType: customerTypeSchema,
  customerDisplayName: z.string().min(1).max(255),
  projectType: projectTypeSchema,
  currency: currencySchema.default('KZT'),
  totalAmountTiyin: z.string().regex(/^\d+$/, 'Must be a positive integer string').optional(),
  sourceType: caseSourceTypeSchema.default('manual'),
  sourceExternalId: z.string().max(255).optional(),
  sourceExternalVersion: z.string().max(255).optional(),
});

export type CreateLegalCaseInput = z.infer<typeof createLegalCaseSchema>;

// Update Legal Case Basics command
export const updateLegalCaseBasicsSchema = z.object({
  caseId: uuidSchema,
  version: z.number().int().positive(),
  title: z.string().min(1).max(500).optional(),
  customerType: customerTypeSchema.optional(),
  customerDisplayName: z.string().min(1).max(255).optional(),
  projectType: projectTypeSchema.optional(),
  totalAmountTiyin: z.string().regex(/^\d+$/, 'Must be a positive integer string').nullable().optional(),
});

export type UpdateLegalCaseBasicsInput = z.infer<typeof updateLegalCaseBasicsSchema>;

// Transition Legal Case Status command
export const transitionLegalCaseStatusSchema = z.object({
  caseId: uuidSchema,
  version: z.number().int().positive(),
  targetStatus: caseStatusSchema,
});

export type TransitionLegalCaseStatusInput = z.infer<typeof transitionLegalCaseStatusSchema>;

// ============================================================
// Stage 2: Legal Source commands
// ============================================================

// Create Legal Source command
export const createLegalSourceSchema = z.object({
  canonicalUrl: z.string().min(1).max(1000),
  title: z.string().min(1).max(500),
  sourceSystem: sourceSystemSchema,
});

export type CreateLegalSourceInput = z.infer<typeof createLegalSourceSchema>;

// Create Legal Source Revision command
export const createLegalSourceRevisionSchema = z.object({
  sourceId: uuidSchema,
  revisionNumber: z.number().int().positive(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').nullable().optional(),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').nullable().optional(),
  contentHash: z.string().min(1).max(255),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type CreateLegalSourceRevisionInput = z.infer<typeof createLegalSourceRevisionSchema>;

// Approve Legal Source Revision command
export const approveLegalSourceRevisionSchema = z.object({
  sourceId: uuidSchema,
  revisionId: uuidSchema,
  sourceStatus: legalSourceStatusSchema.default('approved'),
});

export type ApproveLegalSourceRevisionInput = z.infer<typeof approveLegalSourceRevisionSchema>;

// Create Legal Rule command
export const createLegalRuleSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(2000),
  sourceRevisionId: uuidSchema,
  logic: z.record(z.string(), z.unknown()).default({}),
});

export type CreateLegalRuleInput = z.infer<typeof createLegalRuleSchema>;

// Approve Legal Rule command
export const approveLegalRuleSchema = z.object({
  ruleId: uuidSchema,
  targetStatus: legalRuleStatusSchema,
});

export type ApproveLegalRuleInput = z.infer<typeof approveLegalRuleSchema>;

// ============================================================
// Stage 3: Contract Template commands
// ============================================================

export const templateStatusSchema = z.enum(['draft', 'expert_review', 'published', 'retired']);
export const packageStatusSchema = z.enum(['draft', 'under_review', 'approved_for_internal_use', 'published_for_consultation', 'retired']);

// Create Contract Template command
export const createContractTemplateSchema = z.object({
  code: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric with underscores'),
  title: z.string().min(1).max(500),
  customerType: customerTypeSchema,
  projectType: projectTypeSchema,
  schema: z.record(z.string(), z.unknown()).default({}),
});

export type CreateContractTemplateInput = z.infer<typeof createContractTemplateSchema>;

// Transition Contract Template Status command
export const transitionContractTemplateStatusSchema = z.object({
  templateId: uuidSchema,
  targetStatus: templateStatusSchema,
});

export type TransitionContractTemplateStatusInput = z.infer<typeof transitionContractTemplateStatusSchema>;

// Create Contract Package command
export const createContractPackageSchema = z.object({
  legalCaseId: uuidSchema,
  templateCode: z.string().min(1).max(100),
  contentSnapshot: z.record(z.string(), z.unknown()).default({}),
  sourceRevisionIds: z.array(uuidSchema).default([]),
});

export type CreateContractPackageInput = z.infer<typeof createContractPackageSchema>;

// Transition Contract Package Status command
export const transitionContractPackageStatusSchema = z.object({
  packageId: uuidSchema,
  legalCaseId: uuidSchema,
  targetStatus: packageStatusSchema,
});

export type TransitionContractPackageStatusInput = z.infer<typeof transitionContractPackageStatusSchema>;

// ============================================================
// Stage 4: Contract Approval commands
// ============================================================

export const approvalStatusSchema = z.enum(['draft', 'pending_review', 'approved', 'rejected', 'revoked']);

// Create Contract Approval command
export const createContractApprovalSchema = z.object({
  legalCaseId: uuidSchema,
  contractPackageId: uuidSchema,
  notes: z.string().max(2000).optional(),
});

export type CreateContractApprovalInput = z.infer<typeof createContractApprovalSchema>;

// Transition Contract Approval Status command
export const transitionContractApprovalStatusSchema = z.object({
  approvalId: uuidSchema,
  targetStatus: approvalStatusSchema,
  notes: z.string().max(2000).optional(),
});

export type TransitionContractApprovalStatusInput = z.infer<typeof transitionContractApprovalStatusSchema>;
