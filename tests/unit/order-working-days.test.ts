import { describe, expect, it } from 'vitest';
import { addWorkingDays, reminderDates } from '@/modules/orders/working-days';

describe('order working-day calculations', () => {
  it('skips Saturday and Sunday when adding days', () => {
    expect(addWorkingDays('2026-07-24', 1)).toBe('2026-07-27');
    expect(addWorkingDays('2026-07-24', 5)).toBe('2026-07-31');
  });

  it('calculates reminders backwards in working days', () => {
    expect(reminderDates('2026-08-03', [7, 3, 1, 0])).toEqual([
      '2026-07-23',
      '2026-07-29',
      '2026-07-31',
      '2026-08-03',
    ]);
  });

  it('rejects invalid dates and fractional working days', () => {
    expect(() => addWorkingDays('2026-02-30', 1)).toThrow('Invalid calendar date');
    expect(() => addWorkingDays('2026-07-24', 1.5)).toThrow('integer');
  });
});
