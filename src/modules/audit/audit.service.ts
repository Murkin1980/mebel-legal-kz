/**
 * Audit log domain service.
 *
 * Append-only audit trail for all legally significant actions.
 *
 * RULES:
 * - Cannot update or delete events
 * - Cannot contain PII in payload
 * - Created in same transaction as domain command
 * - Idempotent via command_id
 */

import { createClient } from '@/lib/supabase/server';
import { AppError } from '@/modules/shared/errors';
import type { AuditEvent } from '@/modules/shared/types';

export interface CreateAuditEventInput {
  organizationId: string;
  actorUserId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  commandId: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
  requestCorrelationId?: string;
}

export class AuditService {
  /**
   * Create an audit event
   *
   * This is called within the same transaction as domain commands.
   * The event is append-only and cannot be modified or deleted.
   */
  async createEvent(input: CreateAuditEventInput): Promise<AuditEvent> {
    const supabase = await createClient();

    // Sanitize payload - remove PII
    const sanitizedPayload = this.sanitizePayload(input.payload);

    const { data: event, error } = await supabase
      .from('audit_events')
      .insert({
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId || null,
        event_type: input.eventType,
        entity_type: input.entityType,
        entity_id: input.entityId,
        command_id: input.commandId,
        idempotency_key: input.idempotencyKey || null,
        payload: sanitizedPayload,
        request_correlation_id: input.requestCorrelationId || null,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate command_id (idempotency)
      if (error.code === '23505') {
        // Unique violation - return existing event
        const { data: existing } = await supabase
          .from('audit_events')
          .select('*')
          .eq('command_id', input.commandId)
          .eq('organization_id', input.organizationId)
          .single();

        if (existing) {
          return existing;
        }
      }
      throw new AppError('INTERNAL_ERROR', 'Failed to create audit event', 500);
    }

    return event;
  }

  /**
   * Get audit events for an organization
   */
  async getOrganizationEvents(
    organizationId: string,
    options: {
      entityType?: string;
      entityId?: string;
      eventType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AuditEvent[]> {
    const supabase = await createClient();

    let query = supabase
      .from('audit_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('occurred_at', { ascending: false });

    if (options.entityType) {
      query = query.eq('entity_type', options.entityType);
    }

    if (options.entityId) {
      query = query.eq('entity_id', options.entityId);
    }

    if (options.eventType) {
      query = query.eq('event_type', options.eventType);
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch audit events', 500);
    }

    return data || [];
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    entityType: string,
    entityId: string,
    organizationId: string
  ): Promise<AuditEvent[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('occurred_at', { ascending: true });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch entity audit trail', 500);
    }

    return data || [];
  }

  /**
   * Sanitize payload to remove PII
   *
   * RULES from FOUNDATION.md:
   * - payload cannot contain IIN, BIN, phones, addresses, bank accounts
   * - payload cannot contain full contract text
   */
  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...payload };

    // Remove known PII fields
    const piiFields = [
      'iin',
      'bin',
      'phone',
      'address',
      'bank_account',
      'email',
      'full_name',
      'document_text',
    ];

    for (const field of piiFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Truncate long strings (potential contract text)
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[TRUNCATED]';
      }
    }

    return sanitized;
  }
}

export const auditService = new AuditService();
