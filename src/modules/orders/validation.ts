import { z } from 'zod';
import {
  customerTypeSchema,
  projectTypeSchema,
  uuidSchema,
} from '@/modules/shared/validation';

const isoDateSchema = z.string().date();
const nonNegativeTiyinSchema = z
  .string()
  .regex(/^\d+$/, 'Money must be serialized as a non-negative integer string');

export const orderSnapshotV1Schema = z.object({
  contractVersion: z.literal(1),
  sourceSystem: z.string().min(1).max(80),
  sourceOrderId: z.string().min(1).max(255),
  sourceOrderVersion: z.string().min(1).max(100),
  organizationExternalId: z.string().min(1).max(255),
  customer: z.object({
    externalId: z.string().max(255).optional(),
    displayName: z.string().min(1).max(255),
    type: customerTypeSchema,
  }),
  project: z.object({
    title: z.string().min(1).max(500),
    type: projectTypeSchema,
  }),
  amount: z.object({
    amountTiyin: nonNegativeTiyinSchema,
    currency: z.literal('KZT'),
  }),
  requestedDates: z
    .object({
      productionDueAt: isoDateSchema.optional(),
      deliveryDueAt: isoDateSchema.optional(),
      installationDueAt: isoDateSchema.optional(),
    })
    .optional(),
});

export type OrderSnapshotV1 = z.infer<typeof orderSnapshotV1Schema>;

export const createOrderSchema = z.object({
  orderNumber: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Za-zА-Яа-яЁё0-9._/-]+$/, 'Order number contains unsupported characters'),
  title: z.string().min(1).max(500),
  customerType: customerTypeSchema,
  customerDisplayName: z.string().min(1).max(255),
  projectType: projectTypeSchema,
  totalAmountTiyin: nonNegativeTiyinSchema.default('0'),
  contractRequired: z.boolean().default(false),
  productionDueDate: isoDateSchema.optional(),
  deliveryDueDate: isoDateSchema.optional(),
  sourceSystem: z.string().min(1).max(80).default('manual'),
  sourceOrderId: z.string().max(255).optional(),
  sourceOrderVersion: z.string().max(100).optional(),
  legacyLegalCaseId: uuidSchema.optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const createOrderDocumentSchema = z.object({
  orderId: uuidSchema,
  documentType: z.enum(['contract', 'invoice', 'act']),
  documentNumber: z.string().min(1).max(80),
  amountTiyin: nonNegativeTiyinSchema.optional(),
  contractPackageId: uuidSchema.optional(),
});

export type CreateOrderDocumentInput = z.infer<typeof createOrderDocumentSchema>;

export const createOrderDeadlineSchema = z.object({
  orderId: uuidSchema,
  orderDocumentId: uuidSchema.optional(),
  kind: z.enum(['payment', 'production', 'delivery', 'installation', 'act_return', 'custom']),
  title: z.string().min(1).max(255),
  dueDate: isoDateSchema,
  workingDaysOffset: z.number().int().min(0).max(365).default(0),
  reminderOffsets: z.array(z.number().int().min(0).max(90)).max(8).default([7, 3, 1, 0]),
});

export type CreateOrderDeadlineInput = z.infer<typeof createOrderDeadlineSchema>;
