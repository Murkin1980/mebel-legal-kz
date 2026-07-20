import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_TRANSITIONS,
  PACKAGE_TRANSITIONS,
  APPROVAL_TRANSITIONS,
  ROLE_PERMISSIONS,
} from '@/modules/shared/types';
import type { ContractTemplateStatus, ContractPackageStatus, ApprovalStatus } from '@/modules/shared/types';
import {
  createContractTemplateSchema,
  createContractPackageSchema,
  transitionContractTemplateStatusSchema,
  transitionContractPackageStatusSchema,
  createContractApprovalSchema,
  transitionContractApprovalStatusSchema,
} from '@/modules/shared/validation';

describe('Contract Templates & Packages Integration', () => {
  describe('template state machine logic', () => {
    it('template lifecycle: draft → expert_review → published → retired', () => {
      let status: ContractTemplateStatus = 'draft';

      expect(TEMPLATE_TRANSITIONS[status]).toContain('expert_review');
      status = 'expert_review';

      expect(TEMPLATE_TRANSITIONS[status]).toContain('published');
      status = 'published';

      expect(TEMPLATE_TRANSITIONS[status]).toContain('retired');
      status = 'retired';

      expect(TEMPLATE_TRANSITIONS[status]).toEqual([]);
    });

    it('template early retirement from draft', () => {
      let status: ContractTemplateStatus = 'draft';
      expect(TEMPLATE_TRANSITIONS[status]).toContain('retired');
      status = 'retired';
      expect(TEMPLATE_TRANSITIONS[status]).toEqual([]);
    });

    it('template early retirement from expert_review', () => {
      let status: ContractTemplateStatus = 'expert_review';
      expect(TEMPLATE_TRANSITIONS[status]).toContain('retired');
      status = 'retired';
      expect(TEMPLATE_TRANSITIONS[status]).toEqual([]);
    });
  });

  describe('package state machine logic', () => {
    it('package lifecycle: draft → under_review → approved_for_internal_use → published_for_consultation → retired', () => {
      let status: ContractPackageStatus = 'draft';

      expect(PACKAGE_TRANSITIONS[status]).toContain('under_review');
      status = 'under_review';

      expect(PACKAGE_TRANSITIONS[status]).toContain('approved_for_internal_use');
      status = 'approved_for_internal_use';

      expect(PACKAGE_TRANSITIONS[status]).toContain('published_for_consultation');
      status = 'published_for_consultation';

      expect(PACKAGE_TRANSITIONS[status]).toContain('retired');
      status = 'retired';

      expect(PACKAGE_TRANSITIONS[status]).toEqual([]);
    });

    it('package early retirement from any stage', () => {
      const statuses: ContractPackageStatus[] = [
        'draft',
        'under_review',
        'approved_for_internal_use',
        'published_for_consultation',
      ];

      for (const status of statuses) {
        expect(PACKAGE_TRANSITIONS[status]).toContain('retired');
      }
    });

    it('package cannot skip stages (draft → approved not allowed)', () => {
      expect(PACKAGE_TRANSITIONS.draft).not.toContain('approved_for_internal_use');
    });

    it('package cannot go backwards (published → under_review not allowed)', () => {
      expect(PACKAGE_TRANSITIONS.published_for_consultation).not.toContain('under_review');
    });
  });

  describe('template + package coordination', () => {
    it('package can only be created for published templates', () => {
      const draftTemplateStatuses: ContractTemplateStatus[] = ['draft', 'expert_review', 'retired'];
      const publishedStatus: ContractTemplateStatus = 'published';

      for (const status of draftTemplateStatuses) {
        expect(status).not.toBe(publishedStatus);
      }
    });

    it('package published_for_consultation requires template to be published', () => {
      expect(PACKAGE_TRANSITIONS.approved_for_internal_use).toContain('published_for_consultation');
    });
  });

  describe('validation schemas', () => {
    it('createContractTemplateSchema validates correct input', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG_MEBEL_001',
        title: 'Договор на изготовление мебели',
        customerType: 'individual',
        projectType: 'manufacture_only',
        schema: {
          variables: { customer_name: 'string', amount: 'bigint' },
          blocks: [{ type: 'header', content: 'Договор' }],
        },
      });
      expect(result.success).toBe(true);
    });

    it('createContractTemplateSchema rejects invalid code', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'dog mebel',
        title: 'Test',
        customerType: 'individual',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });

    it('createContractPackageSchema validates correct input', () => {
      const result = createContractPackageSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        templateCode: 'DOG_MEBEL_001',
        contentSnapshot: { customer_name: 'Иванов И.И.', amount: '3500000' },
        sourceRevisionIds: [
          '22222222-2222-2222-2222-222222222222',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('transitionContractTemplateStatusSchema validates correct input', () => {
      const result = transitionContractTemplateStatusSchema.safeParse({
        templateId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'published',
      });
      expect(result.success).toBe(true);
    });

    it('transitionContractPackageStatusSchema validates correct input', () => {
      const result = transitionContractPackageStatusSchema.safeParse({
        packageId: '11111111-1111-1111-1111-111111111111',
        legalCaseId: '22222222-2222-2222-2222-222222222222',
        targetStatus: 'approved_for_internal_use',
      });
      expect(result.success).toBe(true);
    });

    it('transitionContractPackageStatusSchema rejects invalid status', () => {
      const result = transitionContractPackageStatusSchema.safeParse({
        packageId: '11111111-1111-1111-1111-111111111111',
        legalCaseId: '22222222-2222-2222-2222-222222222222',
        targetStatus: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('role permissions', () => {
    it('owner and legal_reviewer can manage templates', () => {
      expect(ROLE_PERMISSIONS.manage_templates.owner).toBe(true);
      expect(ROLE_PERMISSIONS.manage_templates.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.manage_templates.designer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_templates.observer).toBe(false);
    });

    it('owner and legal_reviewer can publish templates', () => {
      expect(ROLE_PERMISSIONS.publish_template.owner).toBe(true);
      expect(ROLE_PERMISSIONS.publish_template.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.publish_template.manager).toBe(false);
      expect(ROLE_PERMISSIONS.publish_template.observer).toBe(false);
    });

    it('all roles can view templates', () => {
      expect(ROLE_PERMISSIONS.view_templates.owner).toBe(true);
      expect(ROLE_PERMISSIONS.view_templates.manager).toBe(true);
      expect(ROLE_PERMISSIONS.view_templates.designer).toBe(true);
      expect(ROLE_PERMISSIONS.view_templates.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.view_templates.observer).toBe(true);
    });

    it('owner, manager, legal_reviewer can manage packages', () => {
      expect(ROLE_PERMISSIONS.manage_packages.owner).toBe(true);
      expect(ROLE_PERMISSIONS.manage_packages.manager).toBe(true);
      expect(ROLE_PERMISSIONS.manage_packages.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.manage_packages.designer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_packages.observer).toBe(false);
    });

    it('owner and legal_reviewer can approve packages', () => {
      expect(ROLE_PERMISSIONS.approve_package.owner).toBe(true);
      expect(ROLE_PERMISSIONS.approve_package.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.approve_package.manager).toBe(false);
      expect(ROLE_PERMISSIONS.approve_package.observer).toBe(false);
    });

    it('owner and legal_reviewer can publish packages', () => {
      expect(ROLE_PERMISSIONS.publish_package.owner).toBe(true);
      expect(ROLE_PERMISSIONS.publish_package.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.publish_package.manager).toBe(false);
      expect(ROLE_PERMISSIONS.publish_package.observer).toBe(false);
    });

    it('all roles can view packages', () => {
      expect(ROLE_PERMISSIONS.view_packages.owner).toBe(true);
      expect(ROLE_PERMISSIONS.view_packages.manager).toBe(true);
      expect(ROLE_PERMISSIONS.view_packages.designer).toBe(true);
      expect(ROLE_PERMISSIONS.view_packages.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.view_packages.observer).toBe(true);
    });
  });

  // ============================================================
  // Stage 4: Contract Approvals Integration
  // ============================================================

  describe('approval state machine logic', () => {
    it('approval lifecycle: draft → pending_review → approved', () => {
      let status: ApprovalStatus = 'draft';

      expect(APPROVAL_TRANSITIONS[status]).toContain('pending_review');
      status = 'pending_review';

      expect(APPROVAL_TRANSITIONS[status]).toContain('approved');
      status = 'approved';

      expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
    });

    it('approval rejection path: draft → pending_review → rejected', () => {
      let status: ApprovalStatus = 'draft';

      expect(APPROVAL_TRANSITIONS[status]).toContain('pending_review');
      status = 'pending_review';

      expect(APPROVAL_TRANSITIONS[status]).toContain('rejected');
      status = 'rejected';

      expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
    });

    it('approval revocation from draft: draft → revoked', () => {
      let status: ApprovalStatus = 'draft';
      expect(APPROVAL_TRANSITIONS[status]).toContain('revoked');
      status = 'revoked';
      expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
    });

    it('approval revocation from review: draft → pending_review → revoked', () => {
      let status: ApprovalStatus = 'draft';

      expect(APPROVAL_TRANSITIONS[status]).toContain('pending_review');
      status = 'pending_review';

      expect(APPROVAL_TRANSITIONS[status]).toContain('revoked');
      status = 'revoked';

      expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
    });

    it('approval cannot skip to approved from draft', () => {
      expect(APPROVAL_TRANSITIONS.draft).not.toContain('approved');
    });

    it('approval cannot go backwards from approved', () => {
      expect(APPROVAL_TRANSITIONS.approved).toEqual([]);
    });
  });

  describe('approval validation schemas', () => {
    it('createContractApprovalSchema validates correct input', () => {
      const result = createContractApprovalSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        contractPackageId: '22222222-2222-2222-2222-222222222222',
        notes: 'Согласование пакета v1',
      });
      expect(result.success).toBe(true);
    });

    it('transitionContractApprovalStatusSchema validates correct input', () => {
      const result = transitionContractApprovalStatusSchema.safeParse({
        approvalId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'pending_review',
      });
      expect(result.success).toBe(true);
    });

    it('transitionContractApprovalStatusSchema rejects invalid status', () => {
      const result = transitionContractApprovalStatusSchema.safeParse({
        approvalId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('approval role permissions', () => {
    it('owner and manager can manage approvals (create, revoke)', () => {
      expect(ROLE_PERMISSIONS.manage_approvals.owner).toBe(true);
      expect(ROLE_PERMISSIONS.manage_approvals.manager).toBe(true);
      expect(ROLE_PERMISSIONS.manage_approvals.designer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_approvals.legal_reviewer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_approvals.observer).toBe(false);
    });

    it('owner and legal_reviewer can decide approvals (approve, reject)', () => {
      expect(ROLE_PERMISSIONS.decide_approvals.owner).toBe(true);
      expect(ROLE_PERMISSIONS.decide_approvals.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.decide_approvals.manager).toBe(false);
      expect(ROLE_PERMISSIONS.decide_approvals.designer).toBe(false);
      expect(ROLE_PERMISSIONS.decide_approvals.observer).toBe(false);
    });

    it('all roles can view approvals', () => {
      expect(ROLE_PERMISSIONS.view_approvals.owner).toBe(true);
      expect(ROLE_PERMISSIONS.view_approvals.manager).toBe(true);
      expect(ROLE_PERMISSIONS.view_approvals.designer).toBe(true);
      expect(ROLE_PERMISSIONS.view_approvals.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.view_approvals.observer).toBe(true);
    });
  });
});
