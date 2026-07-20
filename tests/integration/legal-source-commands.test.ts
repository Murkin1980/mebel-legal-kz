import { describe, it, expect } from 'vitest';
import {
  LEGAL_SOURCE_TRANSITIONS,
  LEGAL_RULE_TRANSITIONS,
  REVISION_TRANSITIONS,
  ROLE_PERMISSIONS,
} from '@/modules/shared/types';
import type { LegalSourceStatus, LegalRuleStatus, LegalSourceRevisionStatus } from '@/modules/shared/types';
import {
  createLegalSourceSchema,
  createLegalSourceRevisionSchema,
  createLegalRuleSchema,
} from '@/modules/shared/validation';

describe('Legal Sources Integration', () => {
  describe('state transition logic', () => {
    it('source lifecycle: draft → approved → deprecated', () => {
      let status: LegalSourceStatus = 'draft';

      expect(LEGAL_SOURCE_TRANSITIONS[status]).toContain('approved');
      status = 'approved';
      expect(status).toBe('approved');

      expect(LEGAL_SOURCE_TRANSITIONS[status]).toContain('deprecated');
      status = 'deprecated';
      expect(status).toBe('deprecated');
    });

    it('revision lifecycle: draft → under_review → approved → retired', () => {
      let status: LegalSourceRevisionStatus = 'draft';

      expect(REVISION_TRANSITIONS[status]).toContain('under_review');
      status = 'under_review';

      expect(REVISION_TRANSITIONS[status]).toContain('approved');
      status = 'approved';

      expect(REVISION_TRANSITIONS[status]).toContain('retired');
      status = 'retired';
    });

    it('rule lifecycle: draft → under_review → approved → retired', () => {
      let status: LegalRuleStatus = 'draft';

      expect(LEGAL_RULE_TRANSITIONS[status]).toContain('under_review');
      status = 'under_review';

      expect(LEGAL_RULE_TRANSITIONS[status]).toContain('approved');
      status = 'approved';

      expect(LEGAL_RULE_TRANSITIONS[status]).toContain('retired');
      status = 'retired';
    });
  });

  describe('validation schemas', () => {
    it('createLegalSourceSchema validates correct input', () => {
      const result = createLegalSourceSchema.safeParse({
        canonicalUrl: 'https://adilet.zan.kz/rus/docs/K0600000157',
        title: 'Налоговый кодекс Республики Казахстан',
        sourceSystem: 'adilet',
      });
      expect(result.success).toBe(true);
    });

    it('createLegalSourceSchema rejects empty URL', () => {
      const result = createLegalSourceSchema.safeParse({
        canonicalUrl: '',
        title: 'Test',
        sourceSystem: 'adilet',
      });
      expect(result.success).toBe(false);
    });

    it('createLegalSourceRevisionSchema validates correct input', () => {
      const result = createLegalSourceRevisionSchema.safeParse({
        sourceId: '11111111-1111-1111-1111-111111111111',
        revisionNumber: 1,
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        contentHash: 'sha256:abc123def456',
        metadata: { articles: ['123', '456'], chapter: '10' },
      });
      expect(result.success).toBe(true);
    });

    it('createLegalRuleSchema validates correct input', () => {
      const result = createLegalRuleSchema.safeParse({
        code: 'KZ_VAT_SHARE_MINIMUM',
        title: 'Минимальная доля НДС',
        description: 'Доля НДС не может быть менее 12%',
        sourceRevisionId: '11111111-1111-1111-1111-111111111111',
        logic: { min_percent: 12, applies_to: 'manufacture' },
      });
      expect(result.success).toBe(true);
    });

    it('createLegalRuleSchema rejects lowercase code', () => {
      const result = createLegalRuleSchema.safeParse({
        code: 'kz_vat_share_minimum',
        title: 'Test',
        description: 'Test',
        sourceRevisionId: '11111111-1111-1111-1111-111111111111',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('role permissions', () => {
    it('owner and legal_reviewer can approve revisions', () => {
      expect(ROLE_PERMISSIONS.approve_legal_source_revision.owner).toBe(true);
      expect(ROLE_PERMISSIONS.approve_legal_source_revision.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.approve_legal_source_revision.manager).toBe(false);
      expect(ROLE_PERMISSIONS.approve_legal_source_revision.observer).toBe(false);
    });

    it('owner, manager, and legal_reviewer can manage sources', () => {
      expect(ROLE_PERMISSIONS.manage_legal_sources.owner).toBe(true);
      expect(ROLE_PERMISSIONS.manage_legal_sources.manager).toBe(true);
      expect(ROLE_PERMISSIONS.manage_legal_sources.legal_reviewer).toBe(true);
      expect(ROLE_PERMISSIONS.manage_legal_sources.designer).toBe(false);
      expect(ROLE_PERMISSIONS.manage_legal_sources.observer).toBe(false);
    });

    it('observer can view sources and rules but not manage', () => {
      expect(ROLE_PERMISSIONS.view_legal_sources.observer).toBe(true);
      expect(ROLE_PERMISSIONS.view_legal_rules.observer).toBe(true);
      expect(ROLE_PERMISSIONS.manage_legal_sources.observer).toBe(false);
    });
  });
});
