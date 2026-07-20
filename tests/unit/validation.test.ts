import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  createLegalCaseSchema,
  updateLegalCaseBasicsSchema,
  transitionLegalCaseStatusSchema,
  createContractTemplateSchema,
  transitionContractTemplateStatusSchema,
  createContractPackageSchema,
  transitionContractPackageStatusSchema,
  createContractApprovalSchema,
  transitionContractApprovalStatusSchema,
  createChangeOrderSchema,
  transitionChangeOrderStatusSchema,
  createClaimSchema,
  transitionClaimStatusSchema,
} from '@/modules/shared/validation';

describe('Validation Schemas', () => {
  describe('createOrganizationSchema', () => {
    it('should accept valid input', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'ООО "Мебель-Тест"',
        slug: 'mebel-test',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug', () => {
      const result = createOrganizationSchema.safeParse({
        name: 'Test',
        slug: 'Invalid Slug!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = createOrganizationSchema.safeParse({
        name: '',
        slug: 'test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createLegalCaseSchema', () => {
    it('should accept valid input', () => {
      const result = createLegalCaseSchema.safeParse({
        caseNumber: 'LC-000001',
        title: 'Производство кухни',
        customerType: 'legal_entity',
        customerDisplayName: 'ТОО "Кухни"',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional totalAmountTiyin', () => {
      const result = createLegalCaseSchema.safeParse({
        caseNumber: 'LC-000001',
        title: 'Test',
        customerType: 'individual',
        customerDisplayName: 'Test',
        projectType: 'manufacture_only',
        totalAmountTiyin: '39000000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid customerType', () => {
      const result = createLegalCaseSchema.safeParse({
        caseNumber: 'LC-000001',
        title: 'Test',
        customerType: 'invalid',
        customerDisplayName: 'Test',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateLegalCaseBasicsSchema', () => {
    it('should accept valid input with version', () => {
      const result = updateLegalCaseBasicsSchema.safeParse({
        caseId: '11111111-1111-1111-1111-111111111111',
        version: 1,
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null totalAmountTiyin', () => {
      const result = updateLegalCaseBasicsSchema.safeParse({
        caseId: '11111111-1111-1111-1111-111111111111',
        version: 1,
        totalAmountTiyin: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('transitionLegalCaseStatusSchema', () => {
    it('should accept valid transition', () => {
      const result = transitionLegalCaseStatusSchema.safeParse({
        caseId: '11111111-1111-1111-1111-111111111111',
        version: 1,
        targetStatus: 'data_collection',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = transitionLegalCaseStatusSchema.safeParse({
        caseId: '11111111-1111-1111-1111-111111111111',
        version: 1,
        targetStatus: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Stage 3: Contract Template schemas
  // ============================================================

  describe('createContractTemplateSchema', () => {
    it('should accept valid input', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG_001',
        title: 'Договор на мебель',
        customerType: 'individual',
        projectType: 'manufacture_only',
        schema: { variables: {}, blocks: [] },
      });
      expect(result.success).toBe(true);
    });

    it('should accept with default schema', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG_002',
        title: 'Test',
        customerType: 'legal_entity',
        projectType: 'manufacture_delivery',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.schema).toEqual({});
      }
    });

    it('should reject invalid code (lowercase)', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'dog_001',
        title: 'Test',
        customerType: 'individual',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });

    it('should reject code with spaces', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG 001',
        title: 'Test',
        customerType: 'individual',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid customerType', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG_001',
        title: 'Test',
        customerType: 'government',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid projectType', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG_001',
        title: 'Test',
        customerType: 'individual',
        projectType: 'apartment',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty code', () => {
      const result = createContractTemplateSchema.safeParse({
        code: '',
        title: 'Test',
        customerType: 'individual',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const result = createContractTemplateSchema.safeParse({
        code: 'DOG_001',
        title: '',
        customerType: 'individual',
        projectType: 'manufacture_only',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionContractTemplateStatusSchema', () => {
    it('should accept valid transition', () => {
      const result = transitionContractTemplateStatusSchema.safeParse({
        templateId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'expert_review',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = transitionContractTemplateStatusSchema.safeParse({
        templateId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Stage 3: Contract Package schemas
  // ============================================================

  describe('createContractPackageSchema', () => {
    it('should accept valid input', () => {
      const result = createContractPackageSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        templateCode: 'DOG_001',
        contentSnapshot: { amount: '1000000' },
        sourceRevisionIds: [],
      });
      expect(result.success).toBe(true);
    });

    it('should accept with defaults', () => {
      const result = createContractPackageSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        templateCode: 'DOG_001',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.contentSnapshot).toEqual({});
        expect(result.data.sourceRevisionIds).toEqual([]);
      }
    });

    it('should accept with sourceRevisionIds', () => {
      const result = createContractPackageSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        templateCode: 'DOG_001',
        sourceRevisionIds: [
          '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid legalCaseId', () => {
      const result = createContractPackageSchema.safeParse({
        legalCaseId: 'not-a-uuid',
        templateCode: 'DOG_001',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty templateCode', () => {
      const result = createContractPackageSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        templateCode: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionContractPackageStatusSchema', () => {
    it('should accept valid transition', () => {
      const result = transitionContractPackageStatusSchema.safeParse({
        packageId: '11111111-1111-1111-1111-111111111111',
        legalCaseId: '22222222-2222-2222-2222-222222222222',
        targetStatus: 'under_review',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = transitionContractPackageStatusSchema.safeParse({
        packageId: '11111111-1111-1111-1111-111111111111',
        legalCaseId: '22222222-2222-2222-2222-222222222222',
        targetStatus: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  // ============================================================
  // Stage 4: Contract Approval schemas
  // ============================================================

  describe('createContractApprovalSchema', () => {
    it('should accept valid input', () => {
      const result = createContractApprovalSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        contractPackageId: '22222222-2222-2222-2222-222222222222',
        notes: 'Запрос согласования',
      });
      expect(result.success).toBe(true);
    });

    it('should accept without notes', () => {
      const result = createContractApprovalSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        contractPackageId: '22222222-2222-2222-2222-222222222222',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid legalCaseId', () => {
      const result = createContractApprovalSchema.safeParse({
        legalCaseId: 'not-a-uuid',
        contractPackageId: '22222222-2222-2222-2222-222222222222',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid contractPackageId', () => {
      const result = createContractApprovalSchema.safeParse({
        legalCaseId: '11111111-1111-1111-1111-111111111111',
        contractPackageId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionContractApprovalStatusSchema', () => {
    it('should accept valid transition', () => {
      const result = transitionContractApprovalStatusSchema.safeParse({
        approvalId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'pending_review',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with notes', () => {
      const result = transitionContractApprovalStatusSchema.safeParse({
        approvalId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'rejected',
        notes: 'Не соответствует требованиям',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = transitionContractApprovalStatusSchema.safeParse({
        approvalId: '11111111-1111-1111-1111-111111111111',
        targetStatus: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid approvalId', () => {
      const result = transitionContractApprovalStatusSchema.safeParse({
        approvalId: 'not-a-uuid',
        targetStatus: 'approved',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createChangeOrderSchema', () => {
    it('should accept valid input', () => {
      const result = createChangeOrderSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        contractPackageId: '550e8400-e29b-41d4-a716-446655440001',
        changeType: 'price',
        deltaAmount: '500000',
        reason: 'Изменение стоимости по согласованию',
      });
      expect(result.success).toBe(true);
    });

    it('should accept negative delta amount', () => {
      const result = createChangeOrderSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        contractPackageId: '550e8400-e29b-41d4-a716-446655440001',
        changeType: 'scope',
        deltaAmount: '-200000',
        reason: 'Уменьшение объёма работ',
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero delta amount', () => {
      const result = createChangeOrderSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        contractPackageId: '550e8400-e29b-41d4-a716-446655440001',
        changeType: 'price',
        deltaAmount: '0',
        reason: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = createChangeOrderSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        contractPackageId: '550e8400-e29b-41d4-a716-446655440001',
        changeType: 'price',
        deltaAmount: '500000',
        reason: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid change type', () => {
      const result = createChangeOrderSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        contractPackageId: '550e8400-e29b-41d4-a716-446655440001',
        changeType: 'invalid',
        deltaAmount: '500000',
        reason: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionChangeOrderStatusSchema', () => {
    it('should accept valid input', () => {
      const result = transitionChangeOrderStatusSchema.safeParse({
        changeOrderId: '550e8400-e29b-41d4-a716-446655440000',
        targetStatus: 'requested',
      });
      expect(result.success).toBe(true);
    });

    it('should accept notes', () => {
      const result = transitionChangeOrderStatusSchema.safeParse({
        changeOrderId: '550e8400-e29b-41d4-a716-446655440000',
        targetStatus: 'approved',
        notes: 'Утверждено юристом',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid changeOrderId', () => {
      const result = transitionChangeOrderStatusSchema.safeParse({
        changeOrderId: 'not-a-uuid',
        targetStatus: 'requested',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createClaimSchema', () => {
    it('should accept valid input', () => {
      const result = createClaimSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'quality',
      });
      expect(result.success).toBe(true);
    });

    it('should accept with optional fields', () => {
      const result = createClaimSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        contractPackageId: '550e8400-e29b-41d4-a716-446655440001',
        changeOrderId: '550e8400-e29b-41d4-a716-446655440002',
        type: 'deadline',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = createClaimSchema.safeParse({
        legalCaseId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('transitionClaimStatusSchema', () => {
    it('should accept valid input', () => {
      const result = transitionClaimStatusSchema.safeParse({
        claimId: '550e8400-e29b-41d4-a716-446655440000',
        targetStatus: 'in_review',
      });
      expect(result.success).toBe(true);
    });

    it('should accept resolved with summary', () => {
      const result = transitionClaimStatusSchema.safeParse({
        claimId: '550e8400-e29b-41d4-a716-446655440000',
        targetStatus: 'resolved',
        resolutionSummary: 'Претензия удовлетворена',
      });
      expect(result.success).toBe(true);
    });

    it('should accept resolved with rule ids', () => {
      const result = transitionClaimStatusSchema.safeParse({
        claimId: '550e8400-e29b-41d4-a716-446655440000',
        targetStatus: 'resolved',
        resolutionSummary: 'Претензия удовлетворена',
        resolutionRuleIds: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid claimId', () => {
      const result = transitionClaimStatusSchema.safeParse({
        claimId: 'not-a-uuid',
        targetStatus: 'in_review',
      });
      expect(result.success).toBe(false);
    });
  });
});
