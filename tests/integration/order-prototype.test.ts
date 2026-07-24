import { describe, expect, it } from 'vitest';
import { orderSnapshotV1Adapter } from '@/modules/orders/integration-contract';
import { createOrderDeadlineSchema, createOrderDocumentSchema } from '@/modules/orders/validation';
import { reminderDates } from '@/modules/orders/working-days';

describe('unified order workflow contract', () => {
  it('supports order → invoice → act → reminders with no contract', () => {
    const snapshot = orderSnapshotV1Adapter.parse({
      contractVersion: 1,
      sourceSystem: 'platform',
      sourceOrderId: 'synthetic-1',
      sourceOrderVersion: '1',
      organizationExternalId: 'synthetic-org',
      customer: { displayName: 'Синтетический клиент', type: 'legal_entity' },
      project: { title: 'Офисная мебель', type: 'manufacture_delivery' },
      amount: { amountTiyin: '11700000', currency: 'KZT' },
    });
    const order = orderSnapshotV1Adapter.toCreateOrder(snapshot, 'ORD-000001');
    expect(order.contractRequired).toBe(false);

    const invoice = createOrderDocumentSchema.parse({
      orderId: '11111111-1111-4111-8111-111111111111',
      documentType: 'invoice',
      documentNumber: 'INV-ORD-000001',
    });
    const act = createOrderDocumentSchema.parse({
      orderId: invoice.orderId,
      documentType: 'act',
      documentNumber: 'ACT-ORD-000001',
    });
    expect([invoice.documentType, act.documentType]).toEqual(['invoice', 'act']);

    const deadline = createOrderDeadlineSchema.parse({
      orderId: invoice.orderId,
      kind: 'payment',
      title: 'Оплатить счёт',
      dueDate: '2026-08-10',
      workingDaysOffset: 10,
      reminderOffsets: [7, 3, 1, 0],
    });
    expect(reminderDates(deadline.dueDate, deadline.reminderOffsets)).toHaveLength(4);
  });
});
