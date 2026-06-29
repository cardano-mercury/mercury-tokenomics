import { describe, it, expect } from 'vitest';
import {
	formatAmount,
	formatAmountWithTicker,
	truncateMiddle,
	formatDateISO,
	percentOf
} from './format';

describe('formatAmount', () => {
	it('groups thousands with no decimals', () => {
		expect(formatAmount(15000000n)).toBe('15,000,000');
		expect(formatAmount(0n)).toBe('0');
		expect(formatAmount(999n)).toBe('999');
	});

	it('places the decimal point and trims trailing zeros', () => {
		expect(formatAmount(1500000n, 6)).toBe('1.5');
		expect(formatAmount(1234567n, 6)).toBe('1.234567');
		expect(formatAmount(1000000n, 6)).toBe('1');
	});

	it('pads small fractional amounts with leading zeros', () => {
		expect(formatAmount(1n, 6)).toBe('0.000001');
		expect(formatAmount(50n, 6)).toBe('0.00005');
	});

	it('handles negative amounts', () => {
		expect(formatAmount(-15000000n)).toBe('-15,000,000');
		expect(formatAmount(-1500000n, 6)).toBe('-1.5');
	});
});

describe('formatAmountWithTicker', () => {
	it('appends the ticker', () => {
		expect(formatAmountWithTicker(1200n, 0, 'ADA')).toBe('1,200 ADA');
	});
});

describe('truncateMiddle', () => {
	it('truncates long values in the middle', () => {
		expect(truncateMiddle('addr1uxxxxxxxxxxxxxxxx324df7')).toBe('addr1uxx..324df7');
	});

	it('leaves short values untouched', () => {
		expect(truncateMiddle('addr1short')).toBe('addr1short');
	});

	it('respects custom lead and tail lengths', () => {
		expect(truncateMiddle('a1b2c3d4e5f6g7', 4, 4)).toBe('a1b2..f6g7');
	});
});

describe('formatDateISO', () => {
	it('formats as YYYY-MM-DD in UTC', () => {
		expect(formatDateISO(new Date('2025-03-18T15:30:00Z'))).toBe('2025-03-18');
	});
});

describe('percentOf', () => {
	it('computes a percentage to two decimals', () => {
		expect(percentOf(283333n, 15000000n)).toBe('1.89');
		expect(percentOf(1n, 2n)).toBe('50.00');
	});

	it('returns zero when the whole is zero', () => {
		expect(percentOf(5n, 0n)).toBe('0.00');
	});

	it('handles full and over-delivery', () => {
		expect(percentOf(10n, 10n)).toBe('100.00');
		expect(percentOf(15n, 10n)).toBe('150.00');
	});
});
