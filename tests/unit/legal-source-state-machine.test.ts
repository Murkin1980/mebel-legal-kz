import { describe, it, expect } from 'vitest';
import {
  LEGAL_SOURCE_TRANSITIONS,
  REVISION_TRANSITIONS,
  LEGAL_RULE_TRANSITIONS,
} from '@/modules/shared/types';
import type { LegalSourceStatus, LegalSourceRevisionStatus, LegalRuleStatus } from '@/modules/shared/types';

describe('Legal Source State Machine', () => {
  describe('legal source transitions', () => {
    it('draft can transition to approved', () => {
      expect(LEGAL_SOURCE_TRANSITIONS.draft).toContain('approved');
    });

    it('approved can transition to deprecated', () => {
      expect(LEGAL_SOURCE_TRANSITIONS.approved).toContain('deprecated');
    });

    it('deprecated cannot transition', () => {
      expect(LEGAL_SOURCE_TRANSITIONS.deprecated).toEqual([]);
    });

    it('draft cannot transition to deprecated', () => {
      expect(LEGAL_SOURCE_TRANSITIONS.draft).not.toContain('deprecated');
    });
  });

  describe('revision transitions', () => {
    it('draft can transition to under_review', () => {
      expect(REVISION_TRANSITIONS.draft).toContain('under_review');
    });

    it('under_review can transition to approved', () => {
      expect(REVISION_TRANSITIONS.under_review).toContain('approved');
    });

    it('approved can transition to retired', () => {
      expect(REVISION_TRANSITIONS.approved).toContain('retired');
    });

    it('retired cannot transition', () => {
      expect(REVISION_TRANSITIONS.retired).toEqual([]);
    });

    it('draft cannot transition to approved directly', () => {
      expect(REVISION_TRANSITIONS.draft).not.toContain('approved');
    });
  });

  describe('legal rule transitions', () => {
    it('draft can transition to under_review', () => {
      expect(LEGAL_RULE_TRANSITIONS.draft).toContain('under_review');
    });

    it('under_review can transition to approved', () => {
      expect(LEGAL_RULE_TRANSITIONS.under_review).toContain('approved');
    });

    it('approved can transition to retired', () => {
      expect(LEGAL_RULE_TRANSITIONS.approved).toContain('retired');
    });

    it('retired cannot transition', () => {
      expect(LEGAL_RULE_TRANSITIONS.retired).toEqual([]);
    });
  });
});

describe('Legal Source Complete Lifecycle', () => {
  it('should follow: draft → approved → deprecated', () => {
    let status: LegalSourceStatus = 'draft';

    expect(LEGAL_SOURCE_TRANSITIONS[status]).toContain('approved');
    status = 'approved';

    expect(LEGAL_SOURCE_TRANSITIONS[status]).toContain('deprecated');
    status = 'deprecated';

    expect(LEGAL_SOURCE_TRANSITIONS[status]).toEqual([]);
  });
});

describe('Revision Complete Lifecycle', () => {
  it('should follow: draft → under_review → approved → retired', () => {
    let status: LegalSourceRevisionStatus = 'draft';

    expect(REVISION_TRANSITIONS[status]).toContain('under_review');
    status = 'under_review';

    expect(REVISION_TRANSITIONS[status]).toContain('approved');
    status = 'approved';

    expect(REVISION_TRANSITIONS[status]).toContain('retired');
    status = 'retired';

    expect(REVISION_TRANSITIONS[status]).toEqual([]);
  });
});

describe('Legal Rule Complete Lifecycle', () => {
  it('should follow: draft → under_review → approved → retired', () => {
    let status: LegalRuleStatus = 'draft';

    expect(LEGAL_RULE_TRANSITIONS[status]).toContain('under_review');
    status = 'under_review';

    expect(LEGAL_RULE_TRANSITIONS[status]).toContain('approved');
    status = 'approved';

    expect(LEGAL_RULE_TRANSITIONS[status]).toContain('retired');
    status = 'retired';

    expect(LEGAL_RULE_TRANSITIONS[status]).toEqual([]);
  });
});
