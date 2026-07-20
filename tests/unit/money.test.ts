import { describe, it, expect } from 'vitest';
import {
  moneyFromTenge,
  moneyFromTiyin,
  moneyToTenge,
  moneyAdd,
  moneySubtract,
  moneyPercent,
  moneyCompare,
  moneyEquals,
  moneySerialize,
  moneyDeserialize,
} from '@/modules/shared/money';

describe('Money', () => {
  describe('moneyFromTenge', () => {
    it('should convert tenge to tyins', () => {
      const money = moneyFromTenge(390_000n);
      expect(money.amountTiyin).toBe(39_000_000n);
      expect(money.currency).toBe('KZT');
    });

    it('should handle zero', () => {
      const money = moneyFromTenge(0n);
      expect(money.amountTiyin).toBe(0n);
    });

    it('should throw for negative amount', () => {
      expect(() => moneyFromTenge(-1n)).toThrow('Money amount cannot be negative');
    });
  });

  describe('moneyFromTiyin', () => {
    it('should create money from tyins', () => {
      const money = moneyFromTiyin(39_000_000n);
      expect(money.amountTiyin).toBe(39_000_000n);
      expect(money.currency).toBe('KZT');
    });

    it('should throw for negative amount', () => {
      expect(() => moneyFromTiyin(-1n)).toThrow('Money amount cannot be negative');
    });
  });

  describe('moneyToTenge', () => {
    it('should convert tyins to tenge', () => {
      const money = moneyFromTiyin(39_000_000n);
      expect(moneyToTenge(money)).toBe(390_000n);
    });
  });

  describe('moneyAdd', () => {
    it('should add two money values', () => {
      const a = moneyFromTenge(100_000n);
      const b = moneyFromTenge(200_000n);
      const result = moneyAdd(a, b);
      expect(result.amountTiyin).toBe(30_000_000n);
    });

    it('should throw for different currencies', () => {
      const a = moneyFromTenge(100n);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = { amountTiyin: 100n, currency: 'USD' } as any;
      expect(() => moneyAdd(a, b)).toThrow('Cannot add different currencies');
    });
  });

  describe('moneySubtract', () => {
    it('should subtract money values', () => {
      const a = moneyFromTenge(300_000n);
      const b = moneyFromTenge(100_000n);
      const result = moneySubtract(a, b);
      expect(result.amountTiyin).toBe(20_000_000n);
    });

    it('should throw for insufficient funds', () => {
      const a = moneyFromTenge(100n);
      const b = moneyFromTenge(200n);
      expect(() => moneySubtract(a, b)).toThrow('Insufficient funds');
    });
  });

  describe('moneyPercent', () => {
    it('should calculate 70% of 390,000 KZT = 273,000 KZT', () => {
      const money = moneyFromTenge(390_000n);
      const result = moneyPercent(money, 70n);
      expect(moneyToTenge(result)).toBe(273_000n);
    });

    it('should calculate 30% of 390,000 KZT = 117,000 KZT', () => {
      const money = moneyFromTenge(390_000n);
      const result = moneyPercent(money, 30n);
      expect(moneyToTenge(result)).toBe(117_000n);
    });

    it('should sum to 100%: 273,000 + 117,000 = 390,000', () => {
      const money = moneyFromTenge(390_000n);
      const part1 = moneyPercent(money, 70n);
      const part2 = moneyPercent(money, 30n);
      const total = moneyAdd(part1, part2);
      expect(total.amountTiyin).toBe(money.amountTiyin);
    });

    it('should NOT have the original contract error: 270,000 + 117,000 ≠ 390,000', () => {
      // This test ensures we don't repeat the error from the original contract
      const money = moneyFromTenge(390_000n);
      const wrongPart1 = moneyFromTenge(270_000n);
      const part2 = moneyPercent(money, 30n);
      const wrongTotal = moneyAdd(wrongPart1, part2);
      expect(wrongTotal.amountTiyin).not.toBe(money.amountTiyin);
    });
  });

  describe('moneyCompare', () => {
    it('should return -1 when a < b', () => {
      const a = moneyFromTenge(100n);
      const b = moneyFromTenge(200n);
      expect(moneyCompare(a, b)).toBe(-1);
    });

    it('should return 0 when a === b', () => {
      const a = moneyFromTenge(100n);
      const b = moneyFromTenge(100n);
      expect(moneyCompare(a, b)).toBe(0);
    });

    it('should return 1 when a > b', () => {
      const a = moneyFromTenge(200n);
      const b = moneyFromTenge(100n);
      expect(moneyCompare(a, b)).toBe(1);
    });
  });

  describe('moneyEquals', () => {
    it('should return true for equal amounts', () => {
      const a = moneyFromTenge(100n);
      const b = moneyFromTenge(100n);
      expect(moneyEquals(a, b)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const a = moneyFromTenge(100n);
      const b = moneyFromTenge(200n);
      expect(moneyEquals(a, b)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize bigint to string', () => {
      const money = moneyFromTenge(390_000n);
      const serialized = moneySerialize(money);
      expect(serialized).toBe('39000000');
    });

    it('should deserialize string to bigint', () => {
      const money = moneyDeserialize('39000000');
      expect(money.amountTiyin).toBe(39_000_000n);
      expect(money.currency).toBe('KZT');
    });

    it('should handle large numbers', () => {
      const large = moneyFromTenge(1_000_000_000n);
      const serialized = moneySerialize(large);
      const deserialized = moneyDeserialize(serialized);
      expect(deserialized.amountTiyin).toBe(large.amountTiyin);
    });
  });
});
