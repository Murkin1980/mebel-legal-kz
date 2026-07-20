/**
 * Change Order domain service.
 *
 * Handles change order operations with:
 * - Tenant isolation via legal_case_id → organization_id lookup
 * - Role-based authorization
 * - Append-only (UPDATE/DELETE forbidden at DB level for app roles)
 * - Change order state machine with prerequisite checks
 * - Unique number generation per organization
 * - Domain commands with audit events
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
} from '@/modules/shared/errors';
import type {
  ChangeOrder,
  ChangeOrderStatus,
  UserRole,
} from '@/modules/shared/types';
import { CHANGE_ORDER_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createChangeOrderSchema,
  transitionChangeOrderStatusSchema,
  type CreateChangeOrderInput,
  type TransitionChangeOrderStatusInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class ChangeOrderService {
  /**
   * Get organization ID from a legal case
   */
  private async getOrgIdFromCase(supabase: SupabaseClient, legalCaseId: string): Promise<string> {
    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('organization_id')
      .eq('id', legalCaseId)
      .single();

    if (!legalCase) {
      throw notFound('Legal case not found');
    }

    return legalCase.organization_id;
  }

  /**
   * Generate next change order number for the organization
   * Format: CO-000001, CO-000002, etc.
   */
  private async generateNumber(supabase: SupabaseClient, organizationId: string): Promise<string> {
    const { data: lastOrder } = await supabase
      .from('change_orders')
      .select('number')
      .eq('organization_id', organizationId)
      .order('number', { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1;
    if (lastOrder && lastOrder.number) {
      const match = lastOrder.number.match(/^CO-(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `CO-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Create a new change order (command: CreateChangeOrder)
   */
  async createChangeOrder(
    input: CreateChangeOrderInput,
    userId: string,
    commandId?: string
  ): Promise<ChangeOrder> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createChangeOrderSchema.parse(input);

    // Resolve organization from case
    const organizationId = await this.getOrgIdFromCase(supabase, validated.legalCaseId);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_changes[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create change orders');
    }

    // Ensure case is not cancelled
    const { data: legalCase } = await supabase
      .from('legal_cases')
      .select('status')
      .eq('id', validated.legalCaseId)
      .single();

    if (!legalCase || legalCase.status === 'cancelled') {
      throw forbidden('Cannot create change order for cancelled case');
    }

    // Ensure package exists and belongs to this case
    const { data: pkg } = await supabase
      .from('contract_packages')
      .select('id, status')
      .eq('id', validated.contractPackageId)
      .eq('legal_case_id', validated.legalCaseId)
      .single();

    if (!pkg) {
      throw notFound('Contract package not found');
    }

    // Generate unique number
    const number = await this.generateNumber(supabase, organizationId);

    // Create change order
    const { data: changeOrder, error } = await supabase
      .from('change_orders')
      .insert({
        organization_id: organizationId,
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        number,
        status: 'draft',
        change_type: validated.changeType,
        delta_amount: validated.deltaAmount,
        reason: validated.reason,
        created_by: userId,
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create change order', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'change_order.created',
      entity_type: 'change_order',
      entity_id: changeOrder.id,
      command_id: cmdId,
      idempotency_key: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        number,
        change_type: validated.changeType,
        delta_amount: validated.deltaAmount,
      },
    });

    return changeOrder;
  }

  /**
   * Transition change order status
   */
  async transitionChangeOrder(
    input: TransitionChangeOrderStatusInput,
    userId: string,
    commandId?: string
  ): Promise<ChangeOrder> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = transitionChangeOrderStatusSchema.parse(input);

    // Get current change order
    const { data: changeOrder } = await supabase
      .from('change_orders')
      .select('*')
      .eq('id', validated.changeOrderId)
      .single();

    if (!changeOrder) {
      throw notFound('Change order not found');
    }

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', changeOrder.organization_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('No active membership');
    }

    const role = membership.role as UserRole;

    // Check specific permissions for each transition
    if (validated.targetStatus === 'requested') {
      if (!ROLE_PERMISSIONS.manage_changes[role]) {
        throw forbidden('Insufficient permissions to request change order approval');
      }
    }

    if (validated.targetStatus === 'approved' || validated.targetStatus === 'rejected') {
      if (!ROLE_PERMISSIONS.approve_changes[role]) {
        throw forbidden(`Insufficient permissions to ${validated.targetStatus} change order`);
      }
      // Self-approval prevention
      if (userId === changeOrder.created_by) {
        throw forbidden('Cannot approve or reject your own change order');
      }
    }

    if (validated.targetStatus === 'applied') {
      if (!ROLE_PERMISSIONS.apply_changes[role]) {
        throw forbidden('Insufficient permissions to apply change order');
      }
    }

    if (validated.targetStatus === 'cancelled') {
      if (!ROLE_PERMISSIONS.manage_changes[role]) {
        throw forbidden('Insufficient permissions to cancel change order');
      }
    }

    // Check state machine
    const allowedTransitions = CHANGE_ORDER_TRANSITIONS[changeOrder.status as ChangeOrderStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(changeOrder.status, validated.targetStatus);
    }

    // Transition status
    const updatePayload: Record<string, unknown> = { status: validated.targetStatus };

    if (validated.targetStatus === 'applied') {
      updatePayload.applied_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from('change_orders')
      .update(updatePayload)
      .eq('id', validated.changeOrderId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update change order status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: changeOrder.organization_id,
      actor_user_id: userId,
      event_type: 'change_order.status_changed',
      entity_type: 'change_order',
      entity_id: validated.changeOrderId,
      command_id: cmdId,
      idempotency_key: cmdId,
      payload: {
        legal_case_id: changeOrder.legal_case_id,
        contract_package_id: changeOrder.contract_package_id,
        number: changeOrder.number,
        from_status: changeOrder.status,
        to_status: validated.targetStatus,
      },
    });

    return updated;
  }

  /**
   * Get change order by ID
   */
  async getChangeOrder(changeOrderId: string): Promise<ChangeOrder> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('change_orders')
      .select('*')
      .eq('id', changeOrderId)
      .single();

    if (error || !data) {
      throw notFound('Change order not found');
    }

    return data;
  }

  /**
   * Get change orders for a case
   */
  async getCaseChangeOrders(
    legalCaseId: string,
    options: { status?: ChangeOrderStatus } = {}
  ): Promise<ChangeOrder[]> {
    const supabase = await createClient();

    let query = supabase
      .from('change_orders')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch change orders', 500);
    }

    return data || [];
  }
}

export const changeOrderService = new ChangeOrderService();
