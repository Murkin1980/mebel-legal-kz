import { describe, expect, it } from 'vitest';
import { orderSnapshotV1Adapter } from '@/modules/orders/integration-contract';
import { createOrderDocumentSchema, createOrderSchema } from '@/modules/orders/validation';

const snapshot = {
  contractVersion: 1 as const,
  sourceSystem: 'furniture-platform',
  sourceOrderId: 'order-42',
  sourceOrderVersion: '7',
  organizationExternalId: 'org-demo',
  customer: {
    displayName: 'Синтетический клиент',
    type: 'individual' as const,
  },
  project: {
    title: 'Тестовая кухня',
    type: 'manufacture_delivery_installation' as const,
  },
  amount: {
    amountTiyin: '39000000',
    currency: 'KZT' as const,
  },
  requestedDates: {
    productionDueAt: '2026-08-10',
    deliveryDueAt: '2026-08-14',
  },
};

describe('OrderSnapshotV1 adapter', () => {
  it('maps an external snapshot without requiring a contract', () => {
    const parsed = orderSnapshotV1Adapter.parse(snapshot);
    const input = orderSnapshotV1Adapter.toCreateOrder(parsed, 'ORD-000042');
    expect(createOrderSchema.parse(input)).toMatchObject({
      orderNumber: 'ORD-000042',
      totalAmountTiyin: '39000000',
      contractRequired: false,
      sourceOrderVersion: '7',
    });
  });

  it('rejects floating-point money in the integration contract', () => {
    expect(() =>
      orderSnapshotV1Adapter.parse({
        ...snapshot,
        amount: { amountTiyin: '390000.50', currency: 'KZT' },
      })
    ).toThrow();
  });

  it('allows invoice and act structures without a contract package', () => {
    for (const documentType of ['invoice', 'act'] as const) {
      expect(
        createOrderDocumentSchema.parse({
          orderId: '11111111-1111-4111-8111-111111111111',
          documentType,
          documentNumber: `${documentType}-1`,
        }).contractPackageId
      ).toBeUndefined();
    }
  });
});
