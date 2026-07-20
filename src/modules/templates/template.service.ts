/**
 * Contract Template domain service.
 *
 * Handles template operations with:
 * - Tenant isolation via organization_id
 * - Role-based authorization
 * - State machine for template statuses
 * - Domain commands with audit events
 * - Published templates are immutable (no UPDATE, only new version via retire+create)
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import {
  AppError,
  forbidden,
  notFound,
  invalidStateTransition,
  conflict,
} from '@/modules/shared/errors';
import type { ContractTemplate, ContractTemplateStatus, UserRole } from '@/modules/shared/types';
import { TEMPLATE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createContractTemplateSchema,
  transitionContractTemplateStatusSchema,
  type CreateContractTemplateInput,
  type TransitionContractTemplateStatusInput,
} from '@/modules/shared/validation';

export class TemplateService {
  /**
   * Create a new contract template (command: CreateContractTemplate)
   */
  async createTemplate(
    input: CreateContractTemplateInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<ContractTemplate> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createContractTemplateSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_templates[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create contract templates');
    }

    // Check if code is unique within organization
    const { data: existing } = await supabase
      .from('contract_templates')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', validated.code)
      .single();

    if (existing) {
      throw conflict('Contract template with this code already exists in this organization');
    }

    // Create template
    const { data: template, error } = await supabase
      .from('contract_templates')
      .insert({
        organization_id: organizationId,
        code: validated.code,
        title: validated.title,
        customer_type: validated.customerType,
        project_type: validated.projectType,
        status: 'draft',
        schema: validated.schema,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create contract template', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'contract_template.created',
      entity_type: 'contract_template',
      entity_id: template.id,
      command_id: cmdId,
      payload: {
        code: template.code,
        title: template.title,
        customer_type: template.customer_type,
        project_type: template.project_type,
        status: 'draft',
      },
    });

    return template;
  }

  /**
   * Transition template status (command: PublishContractTemplate / RetireContractTemplate)
   */
  async transitionTemplate(
    input: TransitionContractTemplateStatusInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<ContractTemplate> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = transitionContractTemplateStatusSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('No active membership');
    }

    // Publish requires legal_reviewer or owner
    const permKey = validated.targetStatus === 'published' ? 'publish_template' : 'manage_templates';
    if (!ROLE_PERMISSIONS[permKey][membership.role as UserRole]) {
      throw forbidden(`Insufficient permissions to transition template to ${validated.targetStatus}`);
    }

    // Get current template
    const { data: template } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', validated.templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!template) {
      throw notFound('Contract template not found');
    }

    // Check state machine
    const allowedTransitions = TEMPLATE_TRANSITIONS[template.status as ContractTemplateStatus];
    if (!allowedTransitions.includes(validated.targetStatus)) {
      throw invalidStateTransition(template.status, validated.targetStatus);
    }

    // Transition status
    const { data: updated, error } = await supabase
      .from('contract_templates')
      .update({ status: validated.targetStatus })
      .eq('id', validated.templateId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update template status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'contract_template.status_changed',
      entity_type: 'contract_template',
      entity_id: validated.templateId,
      command_id: cmdId,
      payload: {
        code: template.code,
        from_status: template.status,
        to_status: validated.targetStatus,
      },
    });

    return updated;
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string, organizationId: string): Promise<ContractTemplate> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw notFound('Contract template not found');
    }

    return data;
  }

  /**
   * Get organization templates
   */
  async getOrganizationTemplates(
    organizationId: string,
    options: {
      status?: ContractTemplateStatus;
      customerType?: string;
      projectType?: string;
    } = {}
  ): Promise<ContractTemplate[]> {
    const supabase = await createClient();

    let query = supabase
      .from('contract_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.customerType) {
      query = query.eq('customer_type', options.customerType);
    }
    if (options.projectType) {
      query = query.eq('project_type', options.projectType);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch contract templates', 500);
    }

    return data || [];
  }
}

export const templateService = new TemplateService();
