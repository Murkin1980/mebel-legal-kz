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
});
