/**
 * Display formatting for on-chain data. Per the style guide, amounts are worked
 * in integer base units and only formatted for display, addresses and hashes
 * are middle-truncated, and dates are ISO. Pure and framework-free.
 */

/** Format integer base units as a grouped decimal string for the given decimals. */
export function formatAmount(base: bigint, decimals = 0): string {
	const negative = base < 0n;
	const abs = (negative ? -base : base).toString().padStart(decimals + 1, '0');
	const cut = abs.length - decimals;
	const intPart = abs.slice(0, cut) || '0';
	const fracPart = decimals > 0 ? abs.slice(cut) : '';
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	const trimmedFrac = fracPart.replace(/0+$/, '');
	const body = trimmedFrac ? `${grouped}.${trimmedFrac}` : grouped;
	return negative ? `-${body}` : body;
}

/** Format an amount with a trailing ticker, for example "1,200 ADA". */
export function formatAmountWithTicker(base: bigint, decimals: number, ticker: string): string {
	return `${formatAmount(base, decimals)} ${ticker}`;
}

/** Truncate the middle of a long string such as an address or hash. */
export function truncateMiddle(value: string, lead = 8, tail = 6): string {
	if (value.length <= lead + tail + 2) return value;
	return `${value.slice(0, lead)}..${value.slice(-tail)}`;
}

/** Format a date as an ISO YYYY-MM-DD string in UTC. */
export function formatDateISO(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Percentage of part over whole, as a fixed-decimal string. Zero whole is 0. */
export function percentOf(part: bigint, whole: bigint, dp = 2): string {
	if (whole === 0n) return (0).toFixed(dp);
	const scale = BigInt(10 ** (dp + 2));
	const rounded = (part * scale + whole / 2n) / whole;
	return (Number(rounded) / 10 ** dp).toFixed(dp);
}
