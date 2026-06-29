<script lang="ts">
	import { ShieldCheck, LineChart, Link2 } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Mercury: Tokenomics Statements</title>
	<meta
		name="description"
		content="Compare a project's promised tokenomics against its actual on-chain behavior, anchored on Cardano."
	/>
</svelte:head>

<section class="relative overflow-hidden">
	<div
		class="absolute inset-0 -z-10"
		style="background: radial-gradient(60% 50% at 80% 0%, rgba(30,217,128,0.18), transparent 70%), radial-gradient(50% 50% at 0% 60%, rgba(30,217,128,0.10), transparent 70%);"
	></div>

	<div class="mx-auto max-w-3xl py-16 text-center">
		<p class="eyebrow mb-4">Don't trust. Verify.</p>
		<h1 class="text-5xl font-bold leading-tight tracking-tight text-ink-900 sm:text-6xl">
			Promised tokenomics, measured against the chain.
		</h1>
		<p class="mx-auto mt-6 max-w-2xl text-lg text-ink-600">
			Declare your token buckets, cliffs, and vesting, anchor them on Cardano, and let anyone
			compare what was promised against what has actually been distributed.
		</p>
		<div class="mt-8 flex items-center justify-center gap-3">
			{#if data.user}
				<a href="/dashboard" class="btn btn-primary">Go to dashboard</a>
			{:else}
				<a href="/signup" class="btn btn-primary">Get started</a>
			{/if}
			<a href="/projects" class="btn btn-ghost">Browse projects</a>
		</div>
	</div>
</section>

<section class="mx-auto grid max-w-5xl gap-6 py-8 sm:grid-cols-3">
	<div class="card p-8">
		<LineChart class="text-mercury" size={24} />
		<h2 class="mt-4 text-lg font-semibold text-ink-900">Promised vs delivered</h2>
		<p class="mt-2 text-sm text-ink-600">
			Time-series curves and snapshots show how closely distribution tracks each bucket's schedule.
		</p>
	</div>
	<div class="card p-8">
		<Link2 class="text-mercury" size={24} />
		<h2 class="mt-4 text-lg font-semibold text-ink-900">Anchored on-chain</h2>
		<p class="mt-2 text-sm text-ink-600">
			The declaration is committed to Cardano metadata so it is timestamped and tamper-evident.
		</p>
	</div>
	<div class="card p-8">
		<ShieldCheck class="text-mercury" size={24} />
		<h2 class="mt-4 text-lg font-semibold text-ink-900">Verifiable by anyone</h2>
		<p class="mt-2 text-sm text-ink-600">
			Reviewers read the statement and confirm it against the chain without an account.
		</p>
	</div>
</section>
