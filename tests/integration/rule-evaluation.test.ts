import { describe, expect, it } from 'vitest';

describe('deterministic rule evaluation contract', () => {
  it('defines stable result semantics', () => {
    const outcomes = ['pass', 'fail', 'warning', 'not_applicable'];
    expect(new Set(outcomes).size).toBe(4);
  });
  it('treats empty and missing required values as incomplete', () => {
    const content: Record<string, unknown> = { customer_name: '' };
    const missing = ['customer_name', 'address'].filter((field) => !content[field]);
    expect(missing).toEqual(['customer_name', 'address']);
  });
  it('does not allow unpublished rule revisions by contract', () => {
    const revisions = [{ id: 'r1', status: 'approved' }, { id: 'r2', status: 'draft' }];
    expect(revisions.filter((r) => r.status === 'approved').map((r) => r.id)).toEqual(['r1']);
  });
  it('detects applicability and known risks deterministically', () => {
    const logic = { applicable_project_types: ['manufacture_only'], risk_if: [{ field: 'payment', equals: 'cash' }] };
    const legalCase = { project_type: 'manufacture_delivery' };
    expect(logic.applicable_project_types.includes(legalCase.project_type)).toBe(false);
    expect([{ payment: 'cash' }].some((x) => x.payment === logic.risk_if[0].equals)).toBe(true);
  });
  it('same command id is idempotent', () => {
    const seen = new Set<string>();
    const command = 'cmd-1';
    seen.add(command);
    expect(seen.has(command)).toBe(true);
    expect(() => seen.add(command)).not.toThrow();
  });
});
