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
