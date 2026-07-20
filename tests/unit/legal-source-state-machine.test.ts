import { describe, it, expect } from 'vitest';
import {
  LEGAL_SOURCE_TRANSITIONS,
  REVISION_TRANSITIONS,
  LEGAL_RULE_TRANSITIONS,
  TEMPLATE_TRANSITIONS,
  PACKAGE_TRANSITIONS,
  APPROVAL_TRANSITIONS,
  CHANGE_ORDER_TRANSITIONS,
  CLAIM_TRANSITIONS,
} from '@/modules/shared/types';
import type {
  LegalSourceStatus,
  LegalSourceRevisionStatus,
  LegalRuleStatus,
  ContractTemplateStatus,
  ContractPackageStatus,
  ApprovalStatus,
  ChangeOrderStatus,
  ClaimStatus,
} from '@/modules/shared/types';

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

// ============================================================
// Stage 3: Contract Template State Machine
// ============================================================

describe('Contract Template State Machine', () => {
  describe('template transitions', () => {
    it('draft can transition to expert_review', () => {
      expect(TEMPLATE_TRANSITIONS.draft).toContain('expert_review');
    });

    it('draft can transition to retired', () => {
      expect(TEMPLATE_TRANSITIONS.draft).toContain('retired');
    });

    it('expert_review can transition to published', () => {
      expect(TEMPLATE_TRANSITIONS.expert_review).toContain('published');
    });

    it('expert_review can transition to retired', () => {
      expect(TEMPLATE_TRANSITIONS.expert_review).toContain('retired');
    });

    it('published can transition to retired', () => {
      expect(TEMPLATE_TRANSITIONS.published).toContain('retired');
    });

    it('retired cannot transition', () => {
      expect(TEMPLATE_TRANSITIONS.retired).toEqual([]);
    });

    it('draft cannot transition to published directly', () => {
      expect(TEMPLATE_TRANSITIONS.draft).not.toContain('published');
    });

    it('published cannot transition to draft', () => {
      expect(TEMPLATE_TRANSITIONS.published).not.toContain('draft');
    });

    it('expert_review cannot transition to draft', () => {
      expect(TEMPLATE_TRANSITIONS.expert_review).not.toContain('draft');
    });
  });
});

describe('Contract Template Complete Lifecycle', () => {
  it('should follow: draft → expert_review → published → retired', () => {
    let status: ContractTemplateStatus = 'draft';

    expect(TEMPLATE_TRANSITIONS[status]).toContain('expert_review');
    status = 'expert_review';

    expect(TEMPLATE_TRANSITIONS[status]).toContain('published');
    status = 'published';

    expect(TEMPLATE_TRANSITIONS[status]).toContain('retired');
    status = 'retired';

    expect(TEMPLATE_TRANSITIONS[status]).toEqual([]);
  });

  it('should follow early retirement: draft → retired', () => {
    let status: ContractTemplateStatus = 'draft';

    expect(TEMPLATE_TRANSITIONS[status]).toContain('retired');
    status = 'retired';

    expect(TEMPLATE_TRANSITIONS[status]).toEqual([]);
  });
});

// ============================================================
// Stage 3: Contract Package State Machine
// ============================================================

describe('Contract Package State Machine', () => {
  describe('package transitions', () => {
    it('draft can transition to under_review', () => {
      expect(PACKAGE_TRANSITIONS.draft).toContain('under_review');
    });

    it('draft can transition to retired', () => {
      expect(PACKAGE_TRANSITIONS.draft).toContain('retired');
    });

    it('under_review can transition to approved_for_internal_use', () => {
      expect(PACKAGE_TRANSITIONS.under_review).toContain('approved_for_internal_use');
    });

    it('under_review can transition to retired', () => {
      expect(PACKAGE_TRANSITIONS.under_review).toContain('retired');
    });

    it('approved_for_internal_use can transition to published_for_consultation', () => {
      expect(PACKAGE_TRANSITIONS.approved_for_internal_use).toContain('published_for_consultation');
    });

    it('approved_for_internal_use can transition to retired', () => {
      expect(PACKAGE_TRANSITIONS.approved_for_internal_use).toContain('retired');
    });

    it('published_for_consultation can transition to retired', () => {
      expect(PACKAGE_TRANSITIONS.published_for_consultation).toContain('retired');
    });

    it('retired cannot transition', () => {
      expect(PACKAGE_TRANSITIONS.retired).toEqual([]);
    });

    it('draft cannot transition to approved_for_internal_use directly', () => {
      expect(PACKAGE_TRANSITIONS.draft).not.toContain('approved_for_internal_use');
    });

    it('draft cannot transition to published_for_consultation directly', () => {
      expect(PACKAGE_TRANSITIONS.draft).not.toContain('published_for_consultation');
    });

    it('under_review cannot transition to published_for_consultation directly', () => {
      expect(PACKAGE_TRANSITIONS.under_review).not.toContain('published_for_consultation');
    });

    it('published_for_consultation cannot transition to draft', () => {
      expect(PACKAGE_TRANSITIONS.published_for_consultation).not.toContain('draft');
    });
  });
});

describe('Contract Package Complete Lifecycle', () => {
  it('should follow: draft → under_review → approved_for_internal_use → published_for_consultation → retired', () => {
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

  it('should follow early retirement at any stage', () => {
    const statuses: ContractPackageStatus[] = ['draft', 'under_review', 'approved_for_internal_use', 'published_for_consultation'];

    for (const status of statuses) {
      expect(PACKAGE_TRANSITIONS[status]).toContain('retired');
    }
  });
});

// ============================================================
// Stage 4: Contract Approval State Machine
// ============================================================

describe('Contract Approval State Machine', () => {
  describe('approval transitions', () => {
    it('draft can transition to pending_review', () => {
      expect(APPROVAL_TRANSITIONS.draft).toContain('pending_review');
    });

    it('draft can transition to revoked', () => {
      expect(APPROVAL_TRANSITIONS.draft).toContain('revoked');
    });

    it('pending_review can transition to approved', () => {
      expect(APPROVAL_TRANSITIONS.pending_review).toContain('approved');
    });

    it('pending_review can transition to rejected', () => {
      expect(APPROVAL_TRANSITIONS.pending_review).toContain('rejected');
    });

    it('pending_review can transition to revoked', () => {
      expect(APPROVAL_TRANSITIONS.pending_review).toContain('revoked');
    });

    it('approved cannot transition', () => {
      expect(APPROVAL_TRANSITIONS.approved).toEqual([]);
    });

    it('rejected cannot transition', () => {
      expect(APPROVAL_TRANSITIONS.rejected).toEqual([]);
    });

    it('revoked cannot transition', () => {
      expect(APPROVAL_TRANSITIONS.revoked).toEqual([]);
    });

    it('draft cannot transition to approved directly', () => {
      expect(APPROVAL_TRANSITIONS.draft).not.toContain('approved');
    });

    it('draft cannot transition to rejected directly', () => {
      expect(APPROVAL_TRANSITIONS.draft).not.toContain('rejected');
    });

    it('pending_review cannot transition to draft', () => {
      expect(APPROVAL_TRANSITIONS.pending_review).not.toContain('draft');
    });
  });
});

describe('Contract Approval Complete Lifecycle', () => {
  it('should follow: draft → pending_review → approved', () => {
    let status: ApprovalStatus = 'draft';

    expect(APPROVAL_TRANSITIONS[status]).toContain('pending_review');
    status = 'pending_review';

    expect(APPROVAL_TRANSITIONS[status]).toContain('approved');
    status = 'approved';

    expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
  });

  it('should follow rejection path: draft → pending_review → rejected', () => {
    let status: ApprovalStatus = 'draft';

    expect(APPROVAL_TRANSITIONS[status]).toContain('pending_review');
    status = 'pending_review';

    expect(APPROVAL_TRANSITIONS[status]).toContain('rejected');
    status = 'rejected';

    expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
  });

  it('should follow revocation from draft: draft → revoked', () => {
    let status: ApprovalStatus = 'draft';

    expect(APPROVAL_TRANSITIONS[status]).toContain('revoked');
    status = 'revoked';

    expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
  });

  it('should follow revocation from review: draft → pending_review → revoked', () => {
    let status: ApprovalStatus = 'draft';

    expect(APPROVAL_TRANSITIONS[status]).toContain('pending_review');
    status = 'pending_review';

    expect(APPROVAL_TRANSITIONS[status]).toContain('revoked');
    status = 'revoked';

    expect(APPROVAL_TRANSITIONS[status]).toEqual([]);
  });
});

describe('Change Order State Machine', () => {
  describe('change order transitions', () => {
    it('draft can transition to requested', () => {
      expect(CHANGE_ORDER_TRANSITIONS.draft).toContain('requested');
    });

    it('draft can transition to cancelled', () => {
      expect(CHANGE_ORDER_TRANSITIONS.draft).toContain('cancelled');
    });

    it('requested can transition to approved', () => {
      expect(CHANGE_ORDER_TRANSITIONS.requested).toContain('approved');
    });

    it('requested can transition to rejected', () => {
      expect(CHANGE_ORDER_TRANSITIONS.requested).toContain('rejected');
    });

    it('approved can transition to applied', () => {
      expect(CHANGE_ORDER_TRANSITIONS.approved).toContain('applied');
    });

    it('approved can transition to cancelled', () => {
      expect(CHANGE_ORDER_TRANSITIONS.approved).toContain('cancelled');
    });

    it('rejected cannot transition', () => {
      expect(CHANGE_ORDER_TRANSITIONS.rejected).toEqual([]);
    });

    it('applied cannot transition', () => {
      expect(CHANGE_ORDER_TRANSITIONS.applied).toEqual([]);
    });

    it('cancelled cannot transition', () => {
      expect(CHANGE_ORDER_TRANSITIONS.cancelled).toEqual([]);
    });
  });

  describe('change order full lifecycle', () => {
    it('draft → requested → approved → applied', () => {
      let status: ChangeOrderStatus = 'draft';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('requested');
      status = 'requested';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('approved');
      status = 'approved';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('applied');
      status = 'applied';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toEqual([]);
    });

    it('draft → requested → rejected (terminal)', () => {
      let status: ChangeOrderStatus = 'draft';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('requested');
      status = 'requested';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('rejected');
      status = 'rejected';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toEqual([]);
    });

    it('draft → cancelled (terminal)', () => {
      let status: ChangeOrderStatus = 'draft';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('cancelled');
      status = 'cancelled';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toEqual([]);
    });

    it('approved → cancelled (terminal)', () => {
      let status: ChangeOrderStatus = 'approved';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toContain('cancelled');
      status = 'cancelled';

      expect(CHANGE_ORDER_TRANSITIONS[status]).toEqual([]);
    });
  });
});

describe('Claim State Machine', () => {
  describe('claim transitions', () => {
    it('open can transition to in_review', () => {
      expect(CLAIM_TRANSITIONS.open).toContain('in_review');
    });

    it('open can transition to withdrawn', () => {
      expect(CLAIM_TRANSITIONS.open).toContain('withdrawn');
    });

    it('in_review can transition to resolved', () => {
      expect(CLAIM_TRANSITIONS.in_review).toContain('resolved');
    });

    it('in_review can transition to withdrawn', () => {
      expect(CLAIM_TRANSITIONS.in_review).toContain('withdrawn');
    });

    it('resolved cannot transition', () => {
      expect(CLAIM_TRANSITIONS.resolved).toEqual([]);
    });

    it('withdrawn cannot transition', () => {
      expect(CLAIM_TRANSITIONS.withdrawn).toEqual([]);
    });
  });

  describe('claim full lifecycle', () => {
    it('open → in_review → resolved', () => {
      let status: ClaimStatus = 'open';

      expect(CLAIM_TRANSITIONS[status]).toContain('in_review');
      status = 'in_review';

      expect(CLAIM_TRANSITIONS[status]).toContain('resolved');
      status = 'resolved';

      expect(CLAIM_TRANSITIONS[status]).toEqual([]);
    });

    it('open → withdrawn (terminal)', () => {
      let status: ClaimStatus = 'open';

      expect(CLAIM_TRANSITIONS[status]).toContain('withdrawn');
      status = 'withdrawn';

      expect(CLAIM_TRANSITIONS[status]).toEqual([]);
    });

    it('in_review → withdrawn (terminal)', () => {
      let status: ClaimStatus = 'in_review';

      expect(CLAIM_TRANSITIONS[status]).toContain('withdrawn');
      status = 'withdrawn';

      expect(CLAIM_TRANSITIONS[status]).toEqual([]);
    });
  });
});
