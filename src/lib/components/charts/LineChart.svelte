<script lang="ts">
	import { formatDateISO } from '$lib/format';

	let {
		pointsIso,
		promised,
		delivered,
		markerIndex = null
	}: {
		pointsIso: string[];
		promised: number[];
		delivered: number[];
		markerIndex?: number | null;
	} = $props();

	const W = 760;
	const H = 280;
	const padL = 16;
	const padR = 16;
	const padT = 16;
	const padB = 28;

	const n = $derived(pointsIso.length);
	const max = $derived(Math.max(1, ...promised, ...delivered));

	function x(i: number): number {
		if (n <= 1) return padL;
		return padL + (i / (n - 1)) * (W - padL - padR);
	}
	function y(v: number): number {
		return H - padB - (v / max) * (H - padT - padB);
	}
	function path(values: number[]): string {
		return values
			.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
			.join(' ');
	}
	function area(values: number[]): string {
		if (values.length === 0) return '';
		return `${path(values)} L${x(values.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
	}
</script>

<div class="w-full">
	<svg
		viewBox="0 0 {W} {H}"
		class="w-full"
		role="img"
		aria-label="Promised versus delivered over time"
	>
		<!-- baseline -->
		<line
			x1={padL}
			y1={y(0)}
			x2={W - padR}
			y2={y(0)}
			stroke="var(--color-ink-200)"
			stroke-width="1"
		/>

		{#if markerIndex !== null && n > 1}
			<line
				x1={x(markerIndex)}
				y1={padT}
				x2={x(markerIndex)}
				y2={y(0)}
				stroke="var(--color-ink-200)"
				stroke-dasharray="4 4"
			/>
		{/if}

		<path d={area(delivered)} fill="var(--color-mercury-050)" stroke="none" />
		<path
			d={path(promised)}
			fill="none"
			stroke="var(--color-ink-400)"
			stroke-width="2"
			stroke-dasharray="5 4"
		/>
		<path d={path(delivered)} fill="none" stroke="var(--color-mercury)" stroke-width="2.5" />

		{#if markerIndex !== null && n > 0}
			<circle
				cx={x(markerIndex)}
				cy={y(promised[markerIndex])}
				r="3.5"
				fill="var(--color-ink-400)"
			/>
			<circle
				cx={x(markerIndex)}
				cy={y(delivered[markerIndex])}
				r="3.5"
				fill="var(--color-mercury)"
			/>
		{/if}
	</svg>

	<div class="mt-2 flex items-center justify-between text-xs text-ink-400">
		<span class="data">{pointsIso.length ? formatDateISO(new Date(pointsIso[0])) : ''}</span>
		<div class="flex items-center gap-4">
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-0.5 w-4 border-t-2 border-dashed border-ink-400"></span> Promised
			</span>
			<span class="flex items-center gap-1.5">
				<span class="inline-block h-0.5 w-4" style="background: var(--color-mercury)"></span> Delivered
			</span>
		</div>
		<span class="data"
			>{pointsIso.length ? formatDateISO(new Date(pointsIso.at(-1) as string)) : ''}</span
		>
	</div>
</div>
