/** Percentage of part over whole for display numbers, to at most two decimals. */
export function percentOfNumbers(part: number, whole: number): string {
	if (whole <= 0) return '0';
	const pct = (part / whole) * 100;
	return pct.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
