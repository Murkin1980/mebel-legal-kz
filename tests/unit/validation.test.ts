import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  createLegalCaseSchema,
  updateLegalCaseBasicsSchema,
  transitionLegalCaseStatusSchema,
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
});
