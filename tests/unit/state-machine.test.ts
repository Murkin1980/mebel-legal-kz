import { describe, it, expect } from 'vitest';
import { CASE_TRANSITIONS, ROLE_PERMISSIONS } from '@/modules/shared/types';
import type { UserRole } from '@/modules/shared/types';

describe('Case State Machine', () => {
  describe('allowed transitions', () => {
    it('draft can transition to data_collection', () => {
      expect(CASE_TRANSITIONS.draft).toContain('data_collection');
    });

    it('draft can transition to cancelled', () => {
      expect(CASE_TRANSITIONS.draft).toContain('cancelled');
    });

    it('data_collection can transition to draft', () => {
      expect(CASE_TRANSITIONS.data_collection).toContain('draft');
    });

    it('data_collection can transition to ready_for_review', () => {
      expect(CASE_TRANSITIONS.data_collection).toContain('ready_for_review');
    });

    it('data_collection can transition to cancelled', () => {
      expect(CASE_TRANSITIONS.data_collection).toContain('cancelled');
    });

    it('ready_for_review can transition to data_collection', () => {
      expect(CASE_TRANSITIONS.ready_for_review).toContain('data_collection');
    });

    it('ready_for_review can transition to approved', () => {
      expect(CASE_TRANSITIONS.ready_for_review).toContain('approved');
    });

    it('ready_for_review can transition to cancelled', () => {
      expect(CASE_TRANSITIONS.ready_for_review).toContain('cancelled');
    });

    it('approved can transition to suspended', () => {
      expect(CASE_TRANSITIONS.approved).toContain('suspended');
    });

    it('approved can transition to closed', () => {
      expect(CASE_TRANSITIONS.approved).toContain('closed');
    });

    it('suspended can transition to approved', () => {
      expect(CASE_TRANSITIONS.suspended).toContain('approved');
    });
  });

  describe('forbidden transitions', () => {
    it('draft cannot transition to approved', () => {
      expect(CASE_TRANSITIONS.draft).not.toContain('approved');
    });

    it('draft cannot transition to closed', () => {
      expect(CASE_TRANSITIONS.draft).not.toContain('closed');
    });

    it('data_collection cannot transition to approved', () => {
      expect(CASE_TRANSITIONS.data_collection).not.toContain('approved');
    });

    it('ready_for_review cannot transition to closed', () => {
      expect(CASE_TRANSITIONS.ready_for_review).not.toContain('closed');
    });

    it('approved cannot transition to draft', () => {
      expect(CASE_TRANSITIONS.approved).not.toContain('draft');
    });

    it('closed cannot transition to anything', () => {
      expect(CASE_TRANSITIONS.closed).toHaveLength(0);
    });

    it('cancelled cannot transition to anything', () => {
      expect(CASE_TRANSITIONS.cancelled).toHaveLength(0);
    });
  });
});

describe('Role Permissions', () => {
  describe('view_cases', () => {
    it('all roles can view cases', () => {
      const roles: UserRole[] = ['owner', 'manager', 'designer', 'legal_reviewer', 'observer'];
      roles.forEach((role) => {
        expect(ROLE_PERMISSIONS.view_cases[role]).toBe(true);
      });
    });
  });

  describe('create_case', () => {
    it('owners can create cases', () => {
      expect(ROLE_PERMISSIONS.create_case.owner).toBe(true);
    });

    it('managers can create cases', () => {
      expect(ROLE_PERMISSIONS.create_case.manager).toBe(true);
    });

    it('designers can create cases', () => {
      expect(ROLE_PERMISSIONS.create_case.designer).toBe(true);
    });

    it('legal_reviewers cannot create cases', () => {
      expect(ROLE_PERMISSIONS.create_case.legal_reviewer).toBe(false);
    });

    it('observers cannot create cases', () => {
      expect(ROLE_PERMISSIONS.create_case.observer).toBe(false);
    });
  });

  describe('transition_to_approved', () => {
    it('owners can approve', () => {
      expect(ROLE_PERMISSIONS.transition_to_approved.owner).toBe(true);
    });

    it('managers cannot approve', () => {
      expect(ROLE_PERMISSIONS.transition_to_approved.manager).toBe(false);
    });

    it('designers cannot approve', () => {
      expect(ROLE_PERMISSIONS.transition_to_approved.designer).toBe(false);
    });

    it('legal_reviewers can approve', () => {
      expect(ROLE_PERMISSIONS.transition_to_approved.legal_reviewer).toBe(true);
    });

    it('observers cannot approve', () => {
      expect(ROLE_PERMISSIONS.transition_to_approved.observer).toBe(false);
    });
  });

  describe('manage_members', () => {
    it('only owners can manage members', () => {
      expect(ROLE_PERMISSIONS.manage_members.owner).toBe(true);
      expect(ROLE_PERMISSIONS.manage_members.manager).toBe(false);
      expect(ROLE_PERMISSIONS.manage_members.designer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_members.legal_reviewer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_members.observer).toBe(false);
    });
  });
});
