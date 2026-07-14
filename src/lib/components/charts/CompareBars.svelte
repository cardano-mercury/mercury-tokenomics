<script lang="ts">
	import { percentOfNumbers } from '$lib/components/charts/util';

	let {
		rows
	}: {
		rows: { name: string; color: string; promised: number; delivered: number }[];
	} = $props();

	const max = $derived(Math.max(1, ...rows.map((r) => r.promised)));

	function fmt(n: number): string {
		return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
	}
</script>

<div class="space-y-4">
	{#each rows as row (row.name)}
		<div>
			<div class="mb-1 flex items-center justify-between text-sm">
				<span class="flex items-center gap-2 text-ink-900">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background: {row.color}"
					></span>
					{row.name}
				</span>
				<span class="data text-xs text-ink-600">
					{fmt(row.delivered)} / {fmt(row.promised)}
					<span class="text-ink-400">({percentOfNumbers(row.delivered, row.promised)}%)</span>
				</span>
			</div>
			<div class="relative h-3 w-full overflow-hidden rounded-full bg-ink-100">
				<div
					class="absolute inset-y-0 left-0 rounded-full opacity-30"
					style="width: {(row.promised / max) * 100}%; background: {row.color}"
				></div>
				<div
					class="absolute inset-y-0 left-0 rounded-full"
					style="width: {(row.delivered / max) * 100}%; background: {row.color}"
				></div>
			</div>
		</div>
	{/each}
</div>
