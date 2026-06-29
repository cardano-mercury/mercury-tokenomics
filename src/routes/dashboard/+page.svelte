<script lang="ts">
	import { Plus, FolderOpen, Settings } from 'lucide-svelte';
	import { formatDateISO } from '$lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Dashboard, Mercury Tokenomics</title></svelte:head>

<div class="flex items-end justify-between">
	<div>
		<p class="eyebrow">Signed in as {data.user.email}</p>
		<h1 class="text-2xl font-bold text-ink-900">Your projects</h1>
	</div>
	<div class="flex items-center gap-2">
		<a href="/dashboard/security" class="btn btn-ghost">
			<Settings size={18} /> Security
		</a>
		<a href="/dashboard/projects/new" class="btn btn-affirmative">
			<Plus size={18} /> New project
		</a>
	</div>
</div>

<div class="mt-8">
	{#if data.projects.length === 0}
		<div class="card flex flex-col items-center gap-3 p-12 text-center">
			<FolderOpen class="text-ink-400" size={28} />
			<h2 class="text-lg font-semibold text-ink-900">No projects yet</h2>
			<p class="max-w-sm text-sm text-ink-600">
				Create a project to declare its tokenomics, link the wallets it controls, and publish a
				statement.
			</p>
			<a href="/dashboard/projects/new" class="btn btn-affirmative mt-2">
				<Plus size={18} /> New project
			</a>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each data.projects as p (p.id)}
				<a href="/dashboard/projects/{p.id}" class="card block p-6 transition hover:shadow-pop">
					<div class="flex items-center justify-between">
						<h2 class="text-lg font-semibold text-ink-900">{p.name}</h2>
						<span class="data rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600"
							>{p.network}</span
						>
					</div>
					<p class="data mt-2 truncate text-xs text-ink-400">{p.policyId}</p>
					<p class="mt-3 text-xs text-ink-400">Updated {formatDateISO(new Date(p.updatedAt))}</p>
				</a>
			{/each}
		</div>
	{/if}
</div>
