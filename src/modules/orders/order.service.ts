import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { AppError, conflict, forbidden, notFound } from '@/modules/shared/errors';
import type { UserRole } from '@/modules/shared/types';
import {
  createOrderDeadlineSchema,
  createOrderDocumentSchema,
  createOrderSchema,
  type CreateOrderDeadlineInput,
  type CreateOrderDocumentInput,
  type CreateOrderInput,
} from './validation';
import { reminderDates } from './working-days';
import type {
  Order,
  OrderDeadline,
  OrderDocument,
  OrderItem,
  OrderReminder,
  OrganizationDocumentProfile,
} from './types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
const ORDER_WRITERS: UserRole[] = ['owner', 'manager', 'designer', 'operations'];
const DOCUMENT_WRITERS: UserRole[] = ['owner', 'manager', 'designer', 'legal_reviewer'];

async function requireRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  allowed: UserRole[]
) {
  const { data } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (!data || !allowed.includes(data.role as UserRole)) {
    throw forbidden('Недостаточно прав для операции с заказом');
  }
}

export class OrderService {
  async createOrder(
    input: CreateOrderInput,
    organizationId: string,
    userId: string,
    commandId = uuidv4()
  ): Promise<Order> {
    const supabase = await createClient();
    const validated = createOrderSchema.parse(input);
    await requireRole(supabase, organizationId, userId, ORDER_WRITERS);

    const { data: order, error } = await supabase.rpc('create_order_with_audit', {
      p_organization_id: organizationId,
      p_actor_user_id: userId,
      p_command_id: commandId,
      p_order: {
        order_number: validated.orderNumber,
        title: validated.title,
        customer_type: validated.customerType,
        customer_display_name: validated.customerDisplayName,
        customer_iin_bin: validated.customerIinBin || null,
        customer_address: validated.customerAddress || null,
        project_type: validated.projectType,
        total_amount_tiyin: validated.totalAmountTiyin,
        contract_required: validated.contractRequired,
        production_due_date: validated.productionDueDate || null,
        delivery_due_date: validated.deliveryDueDate || null,
        source_system: validated.sourceSystem,
        source_order_id: validated.sourceOrderId || null,
        source_order_version: validated.sourceOrderVersion || null,
        legacy_legal_case_id: validated.legacyLegalCaseId || null,
        items: validated.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price_tiyin: item.unitPriceTiyin,
        })),
      },
    });
    if (error || !order) {
      if (error?.code === '23505') {
        throw conflict('Заказ с таким номером уже существует');
      }
      throw new AppError('INTERNAL_ERROR', 'Не удалось создать заказ', 500);
    }
    return order as Order;
  }

  async listOrders(organizationId: string): Promise<Order[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Не удалось загрузить заказы', 500);
    }
    return (data || []) as Order[];
  }

  async getOrderWorkspace(organizationId: string, orderId: string) {
    const supabase = await createClient();
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single();
    if (!order) throw notFound('Заказ не найден');

    const [
      { data: documents },
      { data: deadlines },
      { data: reminders },
      { data: items },
      { data: documentProfile },
    ] =
      await Promise.all([
        supabase
          .from('order_documents')
          .select('*')
          .eq('order_id', orderId)
          .eq('organization_id', organizationId)
          .order('created_at'),
        supabase
          .from('order_deadlines')
          .select('*')
          .eq('order_id', orderId)
          .eq('organization_id', organizationId)
          .order('due_date'),
        supabase
          .from('order_reminders')
          .select('*')
          .eq('organization_id', organizationId)
          .order('remind_on'),
        supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId)
          .eq('organization_id', organizationId)
          .order('position'),
        supabase
          .from('organization_document_profiles')
          .select('*')
          .eq('organization_id', organizationId)
          .maybeSingle(),
      ]);
    const deadlineIds = new Set((deadlines || []).map((deadline) => deadline.id));
    return {
      order: order as Order,
      documents: (documents || []) as OrderDocument[],
      deadlines: (deadlines || []) as OrderDeadline[],
      reminders: (reminders || []).filter((item) =>
        deadlineIds.has(item.deadline_id)
      ) as OrderReminder[],
      items: (items || []) as OrderItem[],
      documentProfile: documentProfile as OrganizationDocumentProfile | null,
    };
  }

  async getDocumentProfile(
    organizationId: string
  ): Promise<OrganizationDocumentProfile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('organization_document_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Не удалось загрузить реквизиты', 500);
    }
    return data as OrganizationDocumentProfile | null;
  }

  async createDocument(
    input: CreateOrderDocumentInput,
    organizationId: string,
    userId: string,
    commandId = uuidv4()
  ): Promise<OrderDocument> {
    const supabase = await createClient();
    const validated = createOrderDocumentSchema.parse(input);
    await requireRole(supabase, organizationId, userId, DOCUMENT_WRITERS);

    const { data: document, error } = await supabase.rpc(
      'create_order_document_with_audit',
      {
        p_organization_id: organizationId,
        p_actor_user_id: userId,
        p_command_id: commandId,
        p_document: {
          order_id: validated.orderId,
          document_type: validated.documentType,
          document_number: validated.documentNumber,
          amount_tiyin: validated.amountTiyin || null,
          contract_package_id: validated.contractPackageId || null,
        },
      }
    );
    if (error || !document) {
      if (error?.code === 'P0002') throw notFound('Заказ не найден');
      throw new AppError(
        'INTERNAL_ERROR',
        'Не удалось создать документ заказа',
        500
      );
    }
    return document as OrderDocument;
  }

  async createDeadline(
    input: CreateOrderDeadlineInput,
    organizationId: string,
    userId: string,
    commandId = uuidv4()
  ): Promise<{ deadline: OrderDeadline; reminders: OrderReminder[] }> {
    const supabase = await createClient();
    const validated = createOrderDeadlineSchema.parse(input);
    await requireRole(supabase, organizationId, userId, ORDER_WRITERS);
    const remindOn = reminderDates(
      validated.dueDate,
      validated.reminderOffsets
    );

    const { data: result, error } = await supabase.rpc(
      'create_order_deadline_with_audit',
      {
        p_organization_id: organizationId,
        p_actor_user_id: userId,
        p_command_id: commandId,
        p_deadline: {
          order_id: validated.orderId,
          order_document_id: validated.orderDocumentId || null,
          kind: validated.kind,
          title: validated.title,
          due_date: validated.dueDate,
          working_days_offset: validated.workingDaysOffset,
        },
        p_remind_on: remindOn,
      }
    );
    if (error || !result) {
      if (error?.code === 'P0002') throw notFound('Заказ не найден');
      throw new AppError(
        'INTERNAL_ERROR',
        'Не удалось создать срок и напоминания',
        500
      );
    }
    return result as {
      deadline: OrderDeadline;
      reminders: OrderReminder[];
    };
  }
}

export const orderService = new OrderService();
