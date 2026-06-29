<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="border-b border-ink-200 bg-surface">
		<div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
			<div class="flex items-baseline gap-3">
				<Wordmark />
				<span class="eyebrow hidden sm:inline">Tokenomics</span>
			</div>
			<nav class="flex items-center gap-2 text-sm">
				<a href="/projects" class="rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100">Projects</a>
				{#if data.user}
					<a href="/dashboard" class="rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100">
						Dashboard
					</a>
					<form method="post" action="/signout">
						<button class="rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100">Sign out</button>
					</form>
				{:else}
					<a href="/login" class="rounded-md px-3 py-2 text-ink-600 hover:bg-ink-100">Sign in</a>
					<a href="/signup" class="btn btn-primary ml-1">Get started</a>
				{/if}
				<ThemeToggle />
			</nav>
		</div>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
		{@render children()}
	</main>

	<footer class="border-t border-ink-200 bg-surface">
		<div
			class="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-6 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between"
		>
			<span>Mercury: Tokenomics Statements, a Catalyst Fund 13 proof of concept.</span>
			<span class="data text-xs">Apache 2.0</span>
		</div>
	</footer>
</div>
