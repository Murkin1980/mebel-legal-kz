'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { orderService } from '@/modules/orders/order.service';
import { AppError } from '@/modules/shared/errors';
import type { DeadlineKind, OrderDocumentType } from '@/modules/orders/types';

async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .single();
  if (!membership) return null;
  return {
    userId: user.id,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
  };
}
function tengeToTiyin(value: string): string {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new AppError('VALIDATION_ERROR', 'Сумма должна быть неотрицательным числом', 400);
  }
  const [whole, fraction = ''] = normalized.split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))).toString();
}

function multiplyMoney(quantity: string, priceTiyin: string): string {
  if (!/^\d+(?:\.\d{1,3})?$/.test(quantity)) {
    throw new AppError('VALIDATION_ERROR', 'Количество должно быть положительным числом', 400);
  }
  const [whole, fraction = ''] = quantity.split('.');
  const thousandths = BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (thousandths <= 0n) {
    throw new AppError('VALIDATION_ERROR', 'Количество должно быть больше нуля', 400);
  }
  return ((thousandths * BigInt(priceTiyin) + 500n) / 1000n).toString();
}

function publicError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.name === 'ZodError') return 'Проверьте обязательные поля';
  return 'Внутренняя ошибка сервера';
}

export async function createOrderAction(
  _previous: { error?: string } | null,
  formData: FormData
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { error: 'Не авторизован' };
    const quantity = String(formData.get('itemQuantity') || '1').trim().replace(',', '.');
    const unitPriceTiyin = tengeToTiyin(String(formData.get('itemUnitPrice') || '0'));
    const totalAmountTiyin = multiplyMoney(quantity, unitPriceTiyin);
    const order = await orderService.createOrder(
      {
        orderNumber: String(formData.get('orderNumber') || ''),
        title: String(formData.get('title') || ''),
        customerType: String(formData.get('customerType') || '') as
          | 'individual'
          | 'individual_entrepreneur'
          | 'legal_entity',
        customerDisplayName: String(formData.get('customerDisplayName') || ''),
        customerIinBin: String(formData.get('customerIinBin') || '') || undefined,
        customerAddress: String(formData.get('customerAddress') || '') || undefined,
        projectType: String(formData.get('projectType') || '') as
          | 'manufacture_only'
          | 'manufacture_delivery'
          | 'manufacture_delivery_installation',
        totalAmountTiyin,
        contractRequired: formData.get('contractRequired') === 'on',
        productionDueDate: String(formData.get('productionDueDate') || '') || undefined,
        deliveryDueDate: String(formData.get('deliveryDueDate') || '') || undefined,
        sourceSystem: 'manual',
        items: [{
          name: String(formData.get('itemName') || ''),
          quantity,
          unit: String(formData.get('itemUnit') || 'шт.'),
          unitPriceTiyin,
        }],
      },
      ctx.organizationId,
      ctx.userId
    );
    revalidatePath('/app/orders');
    return { orderId: order.id };
  } catch (error) {
    return { error: publicError(error) };
  }
}

export async function createOrderDocumentAction(input: {
  orderId: string;
  documentType: OrderDocumentType;
  documentNumber: string;
}) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован' };
    const document = await orderService.createDocument(
      input,
      ctx.organizationId,
      ctx.userId
    );
    revalidatePath(`/app/orders/${input.orderId}`);
    return { success: true, documentId: document.id };
  } catch (error) {
    return { success: false, error: publicError(error) };
  }
}

export async function createOrderDeadlineAction(input: {
  orderId: string;
  kind: DeadlineKind;
  title: string;
  dueDate: string;
  workingDaysOffset: number;
}) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return { success: false, error: 'Не авторизован' };
    const result = await orderService.createDeadline(
      { ...input, reminderOffsets: [7, 3, 1, 0] },
      ctx.organizationId,
      ctx.userId
    );
    revalidatePath(`/app/orders/${input.orderId}`);
    return { success: true, reminderCount: result.reminders.length };
  } catch (error) {
    return { success: false, error: publicError(error) };
  }
}
