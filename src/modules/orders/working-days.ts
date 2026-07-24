const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string): Date {
  if (!ISO_DATE.test(value)) throw new Error('Date must use YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid calendar date');
  }
  return date;
}
export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWorkingDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

export function addWorkingDays(isoDate: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('Working days must be an integer');
  const direction = days < 0 ? -1 : 1;
  let remaining = Math.abs(days);
  const cursor = parseIsoDate(isoDate);
  while (remaining > 0) {
    cursor.setUTCDate(cursor.getUTCDate() + direction);
    if (isWorkingDay(cursor)) remaining -= 1;
  }
  return formatIsoDate(cursor);
}

export function reminderDates(
  dueDate: string,
  offsets: number[] = [7, 3, 1, 0]
): string[] {
  return [...new Set(offsets)]
    .sort((a, b) => b - a)
    .map((offset) => addWorkingDays(dueDate, -offset));
}
