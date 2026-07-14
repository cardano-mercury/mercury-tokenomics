<script lang="ts">
	let {
		slices,
		label = ''
	}: {
		slices: { name: string; color: string; value: number }[];
		label?: string;
	} = $props();

	const r = 60;
	const circumference = 2 * Math.PI * r;
	const total = $derived(slices.reduce((s, x) => s + x.value, 0));

	const segments = $derived(() => {
		let offset = 0;
		return slices.map((s) => {
			const fraction = total > 0 ? s.value / total : 0;
			const seg = { ...s, dash: fraction * circumference, offset: -offset };
			offset += fraction * circumference;
			return seg;
		});
	});
</script>

<div class="flex items-center gap-5">
	<svg
		viewBox="0 0 160 160"
		class="h-36 w-36 -rotate-90"
		role="img"
		aria-label="{label} distribution"
	>
		<circle cx="80" cy="80" {r} fill="none" stroke="var(--color-ink-100)" stroke-width="18" />
		{#each segments() as seg (seg.name)}
			<circle
				cx="80"
				cy="80"
				{r}
				fill="none"
				stroke={seg.color}
				stroke-width="18"
				stroke-dasharray="{seg.dash} {circumference - seg.dash}"
				stroke-dashoffset={seg.offset}
			/>
		{/each}
	</svg>
	<ul class="space-y-1 text-sm">
		{#each slices as s (s.name)}
			<li class="flex items-center gap-2 text-ink-600">
				<span class="inline-block h-2.5 w-2.5 rounded-full" style="background: {s.color}"></span>
				{s.name}
			</li>
		{/each}
	</ul>
</div>
