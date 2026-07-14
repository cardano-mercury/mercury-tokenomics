<script lang="ts">
	import { ShieldCheck, ShieldAlert, Globe, Download, Eye } from 'lucide-svelte';
	import CompareBars from '$lib/components/charts/CompareBars.svelte';
	import DonutChart from '$lib/components/charts/DonutChart.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import { percentOfNumbers } from '$lib/components/charts/util';
	import { formatDateISO, truncateMiddle } from '$lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const lastIndex = $derived(Math.max(0, data.chart.pointsIso.length - 1));
	// Defaults to the latest point; the scrubber reassigns it.
	let index = $derived(lastIndex);

	const atDate = $derived(
		data.chart.pointsIso.length ? formatDateISO(new Date(data.chart.pointsIso[index])) : ''
	);
	const rows = $derived(
		data.chart.buckets.map((b) => ({
			name: b.name,
			color: b.color,
			promised: b.promised[index] ?? 0,
			delivered: b.delivered[index] ?? 0
		}))
	);
	const totalPromised = $derived(data.chart.totalPromised[index] ?? 0);
	const totalDelivered = $derived(data.chart.totalDelivered[index] ?? 0);
</script>

<svelte:head><title>{data.project.name}, tokenomics statement</title></svelte:head>

{#if data.preview}
	<div
		class="mb-4 flex items-center justify-between rounded-md border border-ink-200 bg-ink-100 px-4 py-3 text-sm"
	>
		<span class="flex items-center gap-2 text-ink-600">
			<Eye size={16} /> Draft preview, visible only to you. Publish from the dashboard to make it public.
		</span>
		<a href="/dashboard" class="font-semibold text-ink-900">Dashboard</a>
	</div>
{/if}

<!-- Status bar -->
<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div class="flex items-center gap-3">
		{#if data.anchor && data.anchor.verified}
			<span
				class="flex items-center gap-2 rounded-full bg-mercury-050 px-3 py-1.5 text-sm text-mercury-ink"
			>
				<ShieldCheck size={16} /> Anchored v{data.anchor.version}, verified
			</span>
		{:else if data.anchor}
			<span class="flex items-center gap-2 rounded-full bg-neg-050 px-3 py-1.5 text-sm text-neg">
				<ShieldAlert size={16} /> Anchored v{data.anchor.version}, declaration changed
			</span>
		{:else}
			<span
				class="flex items-center gap-2 rounded-full bg-ink-100 px-3 py-1.5 text-sm text-ink-600"
			>
				<ShieldAlert size={16} /> Not anchored
			</span>
		{/if}
		{#if data.project.website}
			<a
				href={data.project.website}
				class="flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
			>
				<Globe size={16} /> Website
			</a>
		{/if}
	</div>
	<a href="/p/{data.project.slug}/export" class="btn btn-ghost">
		<Download size={18} /> Export as xlsx
	</a>
</div>

<!-- Title -->
<div class="card p-10 text-center">
	<h1 class="font-mono text-3xl font-bold tracking-tight text-mercury">{data.project.name}</h1>
	{#if data.project.description}
		<p class="mx-auto mt-3 max-w-2xl text-sm text-ink-600">{data.project.description}</p>
	{/if}

	<!-- Period scrubber -->
	<div class="mx-auto mt-8 max-w-xl">
		<div class="mb-2 flex items-center justify-center">
			<span class="data rounded-full bg-mercury px-4 py-1.5 text-sm font-medium text-white">
				{atDate}
			</span>
		</div>
		<input
			type="range"
			min="0"
			max={lastIndex}
			bind:value={index}
			class="w-full accent-mercury"
			aria-label="Statement date"
		/>
	</div>
</div>

<!-- Overall -->
<div class="mt-6 grid gap-4 sm:grid-cols-3">
	<div class="card p-6">
		<p class="eyebrow">Promised to date</p>
		<p class="data mt-1 text-2xl font-semibold text-ink-900">
			{totalPromised.toLocaleString('en-US', { maximumFractionDigits: 2 })}
		</p>
	</div>
	<div class="card p-6">
		<p class="eyebrow">Delivered to date</p>
		<p class="data mt-1 text-2xl font-semibold text-pos">
			{totalDelivered.toLocaleString('en-US', { maximumFractionDigits: 2 })}
		</p>
	</div>
	<div class="card p-6">
		<p class="eyebrow">Delivered share</p>
		<p class="data mt-1 text-2xl font-semibold text-ink-900">
			{percentOfNumbers(totalDelivered, totalPromised)}%
		</p>
	</div>
</div>

<!-- Promised vs Delivered bars -->
<div class="mt-6 grid gap-6 lg:grid-cols-2">
	<div class="card p-8">
		<h2 class="mb-6 text-lg font-semibold text-ink-900">Promised vs delivered</h2>
		{#if rows.length}
			<CompareBars {rows} />
		{:else}
			<p class="text-sm text-ink-600">No buckets defined yet.</p>
		{/if}
	</div>
	<div class="card p-8">
		<h2 class="mb-6 text-lg font-semibold text-ink-900">Distribution</h2>
		<div class="grid gap-6 sm:grid-cols-2">
			<div>
				<p class="eyebrow mb-3">Promised</p>
				<DonutChart
					label="Promised"
					slices={data.chart.buckets.map((b) => ({
						name: b.name,
						color: b.color,
						value: b.promised[index] ?? 0
					}))}
				/>
			</div>
			<div>
				<p class="eyebrow mb-3">Delivered</p>
				<DonutChart
					label="Delivered"
					slices={data.chart.buckets.map((b) => ({
						name: b.name,
						color: b.color,
						value: b.delivered[index] ?? 0
					}))}
				/>
			</div>
		</div>
	</div>
</div>

<!-- Timeline -->
<div class="card mt-6 p-8">
	<h2 class="mb-6 text-lg font-semibold text-ink-900">Adherence over time</h2>
	<LineChart
		pointsIso={data.chart.pointsIso}
		promised={data.chart.totalPromised}
		delivered={data.chart.totalDelivered}
		markerIndex={index}
	/>
</div>

{#if data.anchor}
	<p class="mt-6 text-center text-xs text-ink-400">
		Declaration hash <span class="data">{truncateMiddle(data.anchor.hash, 10, 8)}</span> anchored in
		tx <span class="data">{truncateMiddle(data.anchor.txHash, 10, 8)}</span> on
		{formatDateISO(new Date(data.anchor.anchoredAt))}.
	</p>
{/if}
