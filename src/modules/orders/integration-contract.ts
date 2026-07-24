import {
  orderSnapshotV1Schema,
  type OrderSnapshotV1,
  type CreateOrderInput,
} from './validation';

export interface OrderImportAdapter {
  parse(payload: unknown): OrderSnapshotV1;
  toCreateOrder(snapshot: OrderSnapshotV1, orderNumber: string): CreateOrderInput;
}
export const orderSnapshotV1Adapter: OrderImportAdapter = {
  parse(payload) {
    return orderSnapshotV1Schema.parse(payload);
  },
  toCreateOrder(snapshot, orderNumber) {
    return {
      orderNumber,
      title: snapshot.project.title,
      customerType: snapshot.customer.type,
      customerDisplayName: snapshot.customer.displayName,
      projectType: snapshot.project.type,
      totalAmountTiyin: snapshot.amount.amountTiyin,
      contractRequired: false,
      productionDueDate: snapshot.requestedDates?.productionDueAt,
      deliveryDueDate: snapshot.requestedDates?.deliveryDueAt,
      sourceSystem: snapshot.sourceSystem,
      sourceOrderId: snapshot.sourceOrderId,
      sourceOrderVersion: snapshot.sourceOrderVersion,
    };
  },
};
