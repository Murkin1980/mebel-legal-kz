import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
} from '@/modules/shared/errors';
import { moneyAdd, moneyFromTiyin, moneySubtract, moneyCompare } from '@/modules/shared/money';
import type { ExecutionPaymentsSummary, UserRole } from '@/modules/shared/types';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  updatePaymentSummarySchema,
  type UpdatePaymentSummaryInput,
} from '@/modules/shared/validation';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export class ExecutionPaymentsSummaryService {
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

  async updateSummary(
    input: UpdatePaymentSummaryInput,
    userId: string,
    commandId?: string
  ): Promise<ExecutionPaymentsSummary> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = updatePaymentSummarySchema.parse(input);

    const organizationId = await this.getOrgIdFromCase(supabase, validated.legalCaseId);

    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_payments_summary[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to update payment summary');
    }

    const amountDelta = BigInt(validated.amountDelta);
    const deltaMoney = moneyFromTiyin(amountDelta < 0n ? -amountDelta : amountDelta);

    const { data: existingSummary } = await supabase
      .from('execution_payments_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('legal_case_id', validated.legalCaseId)
      .eq('contract_package_id', validated.contractPackageId)
      .single();

    if (!existingSummary) {
      const { data: newSummary, error } = await supabase
        .from('execution_payments_summary')
        .insert({
          organization_id: organizationId,
          legal_case_id: validated.legalCaseId,
          contract_package_id: validated.contractPackageId,
          total_amount: validated.amountDelta,
          paid_amount: '0',
          status: amountDelta > 0n ? 'pending' : 'paid',
          created_by: userId,
          updated_by: userId,
          metadata: validated.metadata || {},
        })
        .select()
        .single();

      if (error) {
        throw new AppError('INTERNAL_ERROR', 'Failed to create payment summary', 500);
      }

      await supabase.from('audit_events').insert({
        organization_id: organizationId,
        actor_user_id: userId,
        event_type: 'payment_summary.created',
        entity_type: 'execution_payments_summary',
        entity_id: newSummary.id,
        command_id: cmdId,
        payload: {
          legal_case_id: validated.legalCaseId,
          contract_package_id: validated.contractPackageId,
          total_amount: validated.amountDelta,
          status: newSummary.status,
        },
      });

      return newSummary;
    }

    const currentTotal = moneyFromTiyin(BigInt(existingSummary.total_amount));
    const currentPaid = moneyFromTiyin(BigInt(existingSummary.paid_amount));

    let newTotal = currentTotal;
    let newPaid = currentPaid;

    if (validated.amountDelta.startsWith('-')) {
      newPaid = moneySubtract(currentPaid, deltaMoney);
    } else {
      newTotal = moneyAdd(currentTotal, deltaMoney);
      newPaid = moneyAdd(currentPaid, deltaMoney);
    }

    let paymentStatus: string;
    if (newPaid.amountTiyin === 0n) {
      paymentStatus = 'pending';
    } else if (moneyCompare(newPaid, newTotal) === 0) {
      paymentStatus = 'paid';
    } else if (newPaid.amountTiyin > 0n && moneyCompare(newPaid, newTotal) < 0) {
      paymentStatus = 'partial';
    } else {
      paymentStatus = 'overdue';
    }

    const updatePayload: Record<string, unknown> = {
      total_amount: newTotal.amountTiyin.toString(),
      paid_amount: newPaid.amountTiyin.toString(),
      status: paymentStatus,
      last_payment_at: validated.amountDelta.startsWith('-')
        ? existingSummary.last_payment_at
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (validated.metadata) {
      updatePayload.metadata = { ...existingSummary.metadata, ...validated.metadata };
    }

    const { data: updated, error } = await supabase
      .from('execution_payments_summary')
      .update(updatePayload)
      .eq('id', existingSummary.id)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update payment summary', 500);
    }

    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'payment_summary.updated',
      entity_type: 'execution_payments_summary',
      entity_id: existingSummary.id,
      command_id: cmdId,
      payload: {
        legal_case_id: validated.legalCaseId,
        contract_package_id: validated.contractPackageId,
        delta_amount: validated.amountDelta,
        previous_total: existingSummary.total_amount,
        new_total: newTotal.amountTiyin.toString(),
        status: paymentStatus,
      },
    });

    return updated;
  }

  async getSummary(
    legalCaseId: string,
    contractPackageId: string
  ): Promise<ExecutionPaymentsSummary | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('execution_payments_summary')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .eq('contract_package_id', contractPackageId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  async getCaseSummaries(legalCaseId: string): Promise<ExecutionPaymentsSummary[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('execution_payments_summary')
      .select('*')
      .eq('legal_case_id', legalCaseId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch payment summaries', 500);
    }

    return data || [];
  }
}

export const executionPaymentsSummaryService = new ExecutionPaymentsSummaryService();
