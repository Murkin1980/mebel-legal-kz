/**
 * Money value object — immutable, stores amount in tyins (tiyin).
 *
 * 1 KZT = 100 tyin
 * 390 000 KZT = 39 000 000 tyin
 *
 * RULES:
 * - Never use float/number for money storage
 * - Always use bigint for amountTiyin
 * - Currency MVP = KZT only
 * - Arithmetic must be deterministic
 * - Rounding rule must be explicit
 */

export type Currency = 'KZT';

export interface Money {
  readonly amountTiyin: bigint;
  readonly currency: Currency;
}

const TYIN_PER_TENGE = 100n;

/**
 * Create Money from tenge amount
 * 390_000 KZT → { amountTiyin: 39_000_000n, currency: 'KZT' }
 */
export function moneyFromTenge(tenge: bigint): Money {
  if (tenge < 0n) {
    throw new Error('Money amount cannot be negative');
  }
  return {
    amountTiyin: tenge * TYIN_PER_TENGE,
    currency: 'KZT',
  };
}

/**
 * Create Money from tyin amount
 */
export function moneyFromTiyin(tiyin: bigint): Money {
  if (tiyin < 0n) {
    throw new Error('Money amount cannot be negative');
  }
  return {
    amountTiyin: tiyin,
    currency: 'KZT',
  };
}

/**
 * Convert Money to tenge
 * 39_000_000 tyin → 390_000 KZT
 */
export function moneyToTenge(money: Money): bigint {
  return money.amountTiyin / TYIN_PER_TENGE;
}

/**
 * Add two Money values (same currency only)
 */
export function moneyAdd(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot add different currencies');
  }
  return {
    amountTiyin: a.amountTiyin + b.amountTiyin,
    currency: a.currency,
  };
}

/**
 * Subtract Money b from a (same currency only)
 */
export function moneySubtract(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error('Cannot subtract different currencies');
  }
  const result = a.amountTiyin - b.amountTiyin;
  if (result < 0n) {
    throw new Error('Insufficient funds');
  }
  return {
    amountTiyin: result,
    currency: a.currency,
  };
}

/**
 * Calculate percentage of Money
 * Rounding: banker's rounding (round half to even)
 *
 * 390 000 KZT × 70% = 273 000 KZT
 * 390 000 KZT × 30% = 117 000 KZT
 */
export function moneyPercent(money: Money, percent: bigint): Money {
  if (money.currency !== 'KZT') {
    throw new Error('Percent calculation only for KZT');
  }

  // Calculate: amountTiyin * percent / 100
  // Using banker's rounding
  const raw = money.amountTiyin * percent;
  const divided = raw / 100n;
  const remainder = raw % 100n;

  // Banker's rounding: round half to even
  let rounded = divided;
  if (remainder > 50n || (remainder === 50n && divided % 2n === 1n)) {
    rounded += 1n;
  } else if (remainder < -50n || (remainder === -50n && divided % 2n === 1n)) {
    rounded -= 1n;
  }

  return {
    amountTiyin: rounded,
    currency: 'KZT',
  };
}

/**
 * Compare two Money values
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function moneyCompare(a: Money, b: Money): -1 | 0 | 1 {
  if (a.currency !== b.currency) {
    throw new Error('Cannot compare different currencies');
  }
  if (a.amountTiyin < b.amountTiyin) return -1;
  if (a.amountTiyin > b.amountTiyin) return 1;
  return 0;
}

/**
 * Check if two Money values are equal
 */
export function moneyEquals(a: Money, b: Money): boolean {
  return a.amountTiyin === b.amountTiyin && a.currency === b.currency;
}

/**
 * Serialize Money for API/JSON
 * bigint → string to avoid precision loss
 */
export function moneySerialize(money: Money): string {
  return money.amountTiyin.toString();
}

/**
 * Deserialize Money from API/JSON
 */
export function moneyDeserialize(amountTiyinStr: string, currency: Currency = 'KZT'): Money {
  const amountTiyin = BigInt(amountTiyinStr);
  if (amountTiyin < 0n) {
    throw new Error('Money amount cannot be negative');
  }
  return { amountTiyin, currency };
}
