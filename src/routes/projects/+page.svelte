<script lang="ts">
	import { formatDateISO } from '$lib/format';
	import { ArrowUpRight, Search, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	/** Build a query string for a target page, preserving search and filter. */
	function pageHref(target: number): string {
		const parts: string[] = [];
		if (data.q) parts.push(`q=${encodeURIComponent(data.q)}`);
		if (data.network) parts.push(`network=${data.network}`);
		if (target > 1) parts.push(`page=${target}`);
		return parts.length ? `/projects?${parts.join('&')}` : '/projects';
	}

	const rangeStart = $derived(data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1);
	const rangeEnd = $derived(Math.min(data.page * data.pageSize, data.total));
</script>

<svelte:head><title>Projects, Mercury Tokenomics</title></svelte:head>

<p class="eyebrow">Public directory</p>
<h1 class="mb-6 text-2xl font-bold text-ink-900">Tokenomics statements</h1>

<form method="get" class="mb-6 flex flex-wrap items-end gap-3">
	<div class="min-w-56 flex-1">
		<label class="label" for="q">Search</label>
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={16} />
			<input
				class="input pl-9"
				id="q"
				name="q"
				value={data.q}
				placeholder="Project name or description"
			/>
		</div>
	</div>
	<div>
		<label class="label" for="network">Network</label>
		<select class="input" id="network" name="network" value={data.network}>
			<option value="">All networks</option>
			<option value="mainnet">Mainnet</option>
			<option value="preprod">Preprod</option>
			<option value="preview">Preview</option>
		</select>
	</div>
	<button class="btn btn-primary">Search</button>
	{#if data.q || data.network}
		<a href="/projects" class="btn btn-ghost">Clear</a>
	{/if}
</form>

{#if data.projects.length === 0}
	<div class="card p-12 text-center">
		<p class="text-ink-600">
			{#if data.q || data.network}
				No projects match your search.
			{:else}
				No projects have published a statement yet.
			{/if}
		</p>
	</div>
{:else}
	<p class="mb-4 text-sm text-ink-400">
		Showing {rangeStart} to {rangeEnd} of {data.total} project{data.total === 1 ? '' : 's'}
	</p>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.projects as p (p.slug)}
			<a href="/p/{p.slug}" class="card group block p-6 transition hover:shadow-pop">
				<div class="flex items-start justify-between">
					<h2 class="text-lg font-semibold text-ink-900">{p.name}</h2>
					<ArrowUpRight class="text-ink-400 transition group-hover:text-mercury" size={18} />
				</div>
				{#if p.description}
					<p class="mt-2 line-clamp-2 text-sm text-ink-600">{p.description}</p>
				{/if}
				<div class="mt-4 flex items-center justify-between text-xs text-ink-400">
					<span class="data rounded-full bg-ink-100 px-2 py-0.5">{p.network}</span>
					<span>Updated {formatDateISO(new Date(p.updatedAt))}</span>
				</div>
			</a>
		{/each}
	</div>

	{#if data.totalPages > 1}
		<nav class="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
			{#if data.page > 1}
				<a href={pageHref(data.page - 1)} class="btn btn-ghost">
					<ChevronLeft size={18} /> Previous
				</a>
			{:else}
				<span class="btn btn-ghost opacity-40"><ChevronLeft size={18} /> Previous</span>
			{/if}
			<span class="data text-sm text-ink-600">Page {data.page} of {data.totalPages}</span>
			{#if data.page < data.totalPages}
				<a href={pageHref(data.page + 1)} class="btn btn-ghost">
					Next <ChevronRight size={18} />
				</a>
			{:else}
				<span class="btn btn-ghost opacity-40">Next <ChevronRight size={18} /></span>
			{/if}
		</nav>
	{/if}
{/if}
