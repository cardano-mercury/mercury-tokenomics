<script lang="ts">
	import { formatDateISO } from '$lib/format';
	import { ArrowUpRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Projects, Mercury Tokenomics</title></svelte:head>

<p class="eyebrow">Public directory</p>
<h1 class="mb-6 text-2xl font-bold text-ink-900">Tokenomics statements</h1>

{#if data.projects.length === 0}
	<div class="card p-12 text-center">
		<p class="text-ink-600">No projects have published a statement yet.</p>
	</div>
{:else}
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
{/if}
