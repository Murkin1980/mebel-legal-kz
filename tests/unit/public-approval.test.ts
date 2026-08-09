import { describe, expect, it } from 'vitest';
import { recordClientApprovalDecisionSchema } from '@/modules/shared/validation';

describe('public client approval validation', () => {
  const valid = {
    token: 'x'.repeat(43),
    challengeCode: 'A1B2C3D4',
    decision: 'approved' as const,
    commandId: '11111111-1111-4111-8111-111111111111',
  };

  it('accepts a token, separate challenge and stable command id', () => {
    expect(recordClientApprovalDecisionSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a short or malformed challenge', () => {
    expect(recordClientApprovalDecisionSchema.safeParse({ ...valid, challengeCode: '1234' }).success).toBe(false);
  });

  it('allows only approve or reject', () => {
    expect(recordClientApprovalDecisionSchema.safeParse({ ...valid, decision: 'maybe' }).success).toBe(false);
  });

  it('limits client-provided text', () => {
    expect(recordClientApprovalDecisionSchema.safeParse({ ...valid, comment: 'x'.repeat(2001) }).success).toBe(false);
  });
});
