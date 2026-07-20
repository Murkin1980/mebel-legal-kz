/**
 * Organization domain service.
 *
 * Handles organization and membership operations with:
 * - Tenant isolation
 * - Role-based authorization
 * - Domain commands
 * - Audit events
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';
import { AppError, forbidden, notFound, conflict } from '@/modules/shared/errors';
import type { Organization, OrganizationMembership, UserRole } from '@/modules/shared/types';
import { ROLE_PERMISSIONS } from '@/modules/shared/types';
import {
  createOrganizationSchema,
  addOrganizationMemberSchema,
  type CreateOrganizationInput,
  type AddOrganizationMemberInput,
} from '@/modules/shared/validation';

export class OrganizationService {
  /**
   * Create a new organization (command: CreateOrganization)
   *
   * Only authenticated users can create organizations.
   * The creator becomes the owner.
   */
  async createOrganization(
    input: CreateOrganizationInput,
    userId: string,
    commandId?: string
  ): Promise<{ organization: Organization; membership: OrganizationMembership }> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    // Validate input
    const validated = createOrganizationSchema.parse(input);

    // Check if slug is unique
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', validated.slug)
      .single();

    if (existing) {
      throw conflict('Organization with this slug already exists');
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: validated.name,
        slug: validated.slug,
        country_code: validated.countryCode,
        default_currency: validated.defaultCurrency,
      })
      .select()
      .single();

    if (orgError) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create organization', 500);
    }

    // Add creator as owner
    const { data: membership, error: memberError } = await supabase
      .from('organization_memberships')
      .insert({
        organization_id: organization.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
      })
      .select()
      .single();

    if (memberError) {
      throw new AppError('INTERNAL_ERROR', 'Failed to add organization owner', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: organization.id,
      actor_user_id: userId,
      event_type: 'organization.created',
      entity_type: 'organization',
      entity_id: organization.id,
      command_id: cmdId,
      payload: {
        name: organization.name,
        slug: organization.slug,
      },
    });

    return { organization, membership };
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const supabase = await createClient();

    // Query through memberships
    const { data: memberships } = await supabase
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const orgIds = memberships.map(m => m.organization_id);

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds);

    if (orgsError) {
      throw new AppError('INTERNAL_ERROR', 'Failed to fetch organizations', 500);
    }

    return orgs || [];
  }

  /**
   * Add a member to an organization (command: AddOrganizationMember)
   *
   * Only owners can add members.
   */
  async addMember(
    input: AddOrganizationMemberInput,
    actorUserId: string,
    commandId?: string
  ): Promise<OrganizationMembership> {
    const supabase = await createClient();
    const cmdId = commandId || uuidv4();

    // Validate input
    const validated = addOrganizationMemberSchema.parse(input);

    // Check if actor is owner of the organization
    const { data: actorMembership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', validated.organizationId)
      .eq('user_id', actorUserId)
      .eq('status', 'active')
      .single();

    if (!actorMembership || !ROLE_PERMISSIONS.manage_members[actorMembership.role as UserRole]) {
      throw forbidden('Only owners can add members');
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', validated.organizationId)
      .eq('user_id', validated.userId)
      .single();

    if (existingMember) {
      throw conflict('User is already a member of this organization');
    }

    // Add member
    const { data: membership, error } = await supabase
      .from('organization_memberships')
      .insert({
        organization_id: validated.organizationId,
        user_id: validated.userId,
        role: validated.role,
        status: 'invited',
      })
      .select()
      .single();

    if (error) {
      throw new AppError('INTERNAL_ERROR', 'Failed to add member', 500);
    }

    // Create audit event
    await supabase.from('audit_events').insert({
      organization_id: validated.organizationId,
      actor_user_id: actorUserId,
      event_type: 'member.added',
      entity_type: 'organization_membership',
      entity_id: membership.id,
      command_id: cmdId,
      payload: {
        user_id: validated.userId,
        role: validated.role,
      },
    });

    return membership;
  }

  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: string, userId: string): Promise<Organization> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error || !data) {
      throw notFound('Organization not found');
    }

    // Verify user is a member
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership) {
      throw forbidden('Not a member of this organization');
    }

    return data;
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<UserRole | null> {
    const supabase = await createClient();

    const { data } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return data?.role as UserRole | null;
  }

  /**
   * Check if user has specific permission
   */
  async checkPermission(
    organizationId: string,
    userId: string,
    permission: keyof typeof ROLE_PERMISSIONS
  ): Promise<boolean> {
    const role = await this.getUserRole(organizationId, userId);
    if (!role) return false;
    return ROLE_PERMISSIONS[permission][role];
  }
}

export const organizationService = new OrganizationService();
