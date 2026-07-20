/**
 * Legal Source domain service.
 *
 * Handles legal source and revision operations with:
 * - Tenant isolation via organization_id
 * - Role-based authorization
 * - State machine for source and revision statuses
 * - Domain commands with audit events
 * - Idempotent commands
 * - Immutability of published revisions
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
import type {
  LegalSource,
  LegalSourceRevision,
  UserRole,
  LegalSourceStatus,
  LegalSourceRevisionStatus,
} from '@/modules/shared/types';
import {
  LEGAL_SOURCE_TRANSITIONS,
  REVISION_TRANSITIONS,
  ROLE_PERMISSIONS,
} from '@/modules/shared/types';
import {
  createLegalSourceSchema,
  createLegalSourceRevisionSchema,
  approveLegalSourceRevisionSchema,
  type CreateLegalSourceInput,
  type CreateLegalSourceRevisionInput,
  type ApproveLegalSourceRevisionInput,
} from '@/modules/shared/validation';

export class LegalSourceService {
  /**
   * Create a new legal source (command: CreateLegalSource)
   *
   * Only owners, managers, and legal_reviewers can create sources.
   */
  async createSource(
    input: CreateLegalSourceInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalSource> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createLegalSourceSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_legal_sources[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create legal sources');
    }

    // Check if canonical_url is unique within organization
    const { data: existing } = await supabase
      .from('legal_sources')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('canonical_url', validated.canonicalUrl)
      .single();

    if (existing) {
      throw conflict('Legal source with this URL already exists in this organization');
    }

    // Create source
    const { data: source, error } = await supabase
      .from('legal_sources')
      .insert({
        organization_id: organizationId,
        canonical_url: validated.canonicalUrl,
        title: validated.title,
        source_system: validated.sourceSystem,
        status: 'draft',
        is_allowed: false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create legal source', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'legal_source.created',
      entity_type: 'legal_source',
      entity_id: source.id,
      command_id: cmdId,
      payload: {
        title: source.title,
        source_system: source.source_system,
        canonical_url: source.canonical_url,
      },
    });

    return source;
  }

  /**
   * Create a new revision for a legal source (command: CreateLegalSourceRevision)
   *
   * Creates a new immutable revision snapshot.
   */
  async createRevision(
    input: CreateLegalSourceRevisionInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<LegalSourceRevision> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = createLegalSourceRevisionSchema.parse(input);

    // Check permission
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.manage_legal_sources[membership.role as UserRole]) {
      throw forbidden('Insufficient permissions to create legal source revisions');
    }

    // Verify source belongs to organization
    const { data: source } = await supabase
      .from('legal_sources')
      .select('id')
      .eq('id', validated.sourceId)
      .eq('organization_id', organizationId)
      .single();

    if (!source) {
      throw notFound('Legal source not found in this organization');
    }

    // Check if revision_number is unique within source
    const { data: existingRevision } = await supabase
      .from('legal_source_revisions')
      .select('id')
      .eq('source_id', validated.sourceId)
      .eq('revision_number', validated.revisionNumber)
      .single();

    if (existingRevision) {
      throw conflict('Revision number already exists for this source');
    }

    // Create revision
    const { data: revision, error } = await supabase
      .from('legal_source_revisions')
      .insert({
        source_id: validated.sourceId,
        revision_number: validated.revisionNumber,
        effective_from: validated.effectiveFrom || null,
        effective_to: validated.effectiveTo || null,
        fetched_at: new Date().toISOString(),
        fetched_by: userId,
        content_hash: validated.contentHash,
        status: 'draft',
        metadata: validated.metadata,
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create legal source revision', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'legal_source_revision.created',
      entity_type: 'legal_source_revision',
      entity_id: revision.id,
      command_id: cmdId,
      payload: {
        source_id: validated.sourceId,
        revision_number: validated.revisionNumber,
        content_hash: validated.contentHash,
        status: 'draft',
      },
    });

    return revision;
  }

  /**
   * Approve a legal source revision (command: ApproveLegalSourceRevision)
   *
   * Only owners and legal_reviewers can approve.
   * This also transitions the source status to approved.
   */
  async approveRevision(
    input: ApproveLegalSourceRevisionInput,
    organizationId: string,
    userId: string,
    commandId?: string
  ): Promise<{ source: LegalSource; revision: LegalSourceRevision }> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    const validated = approveLegalSourceRevisionSchema.parse(input);

    // Check permission - only owner and legal_reviewer
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !ROLE_PERMISSIONS.approve_legal_source_revision[membership.role as UserRole]) {
      throw forbidden('Only owners and legal reviewers can approve legal source revisions');
    }

    // Get source
    const { data: source } = await supabase
      .from('legal_sources')
      .select('*')
      .eq('id', validated.sourceId)
      .eq('organization_id', organizationId)
      .single();

    if (!source) {
      throw notFound('Legal source not found');
    }

    // Get revision
    const { data: revision } = await supabase
      .from('legal_source_revisions')
      .select('*')
      .eq('id', validated.revisionId)
      .eq('source_id', validated.sourceId)
      .single();

    if (!revision) {
      throw notFound('Legal source revision not found');
    }

    // Check state machine: revision must be under_review
    const allowedRevisionTransitions = REVISION_TRANSITIONS[revision.status as LegalSourceRevisionStatus];
    if (!allowedRevisionTransitions.includes('approved')) {
      throw invalidStateTransition(revision.status, 'approved');
    }

    // Check state machine: source must be draft or approved
    const allowedSourceTransitions = LEGAL_SOURCE_TRANSITIONS[source.status as LegalSourceStatus];
    if (!allowedSourceTransitions.includes(validated.sourceStatus)) {
      throw invalidStateTransition(source.status, validated.sourceStatus);
    }

    // Transition revision to approved
    const { data: updatedRevision, error: revisionError } = await supabase
      .from('legal_source_revisions')
      .update({ status: 'approved' })
      .eq('id', validated.revisionId)
      .eq('source_id', validated.sourceId)
      .select()
      .single();

    if (revisionError || !updatedRevision) {
      throw new AppError('INTERNAL_ERROR', 'Failed to approve revision', 500);
    }

    // Transition source status
    const { data: updatedSource, error: sourceError } = await supabase
      .from('legal_sources')
      .update({
        status: validated.sourceStatus,
        is_allowed: validated.sourceStatus === 'approved',
      })
      .eq('id', validated.sourceId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (sourceError || !updatedSource) {
      throw new AppError('INTERNAL_ERROR', 'Failed to update source status', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: userId,
      event_type: 'legal_source_revision.approved',
      entity_type: 'legal_source_revision',
      entity_id: validated.revisionId,
      command_id: cmdId,
      payload: {
        source_id: validated.sourceId,
        revision_number: revision.revision_number,
        source_new_status: validated.sourceStatus,
        content_hash: revision.content_hash,
      },
    });

    return { source: updatedSource, revision: updatedRevision };
  }

  /**
   * Get source by ID
   */
  async getSource(sourceId: string, organizationId: string): Promise<LegalSource> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_sources')
      .select('*')
      .eq('id', sourceId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw notFound('Legal source not found');
    }

    return data;
  }

  /**
   * Get organization sources
   */
  async getOrganizationSources(
    organizationId: string,
    options: { status?: LegalSourceStatus; sourceSystem?: string } = {}
  ): Promise<LegalSource[]> {
    const supabase = await createClient();

    let query = supabase
      .from('legal_sources')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.sourceSystem) {
      query = query.eq('source_system', options.sourceSystem);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch legal sources', 500);
    }

    return data || [];
  }

  /**
   * Get revisions for a source
   */
  async getSourceRevisions(sourceId: string): Promise<LegalSourceRevision[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_source_revisions')
      .select('*')
      .eq('source_id', sourceId)
      .order('revision_number', { ascending: false });

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch revisions', 500);
    }

    return data || [];
  }

  /**
   * Get revision by ID
   */
  async getRevision(revisionId: string): Promise<LegalSourceRevision> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('legal_source_revisions')
      .select('*')
      .eq('id', revisionId)
      .single();

    if (error || !data) {
      throw notFound('Legal source revision not found');
    }

    return data;
  }
}

export const legalSourceService = new LegalSourceService();
