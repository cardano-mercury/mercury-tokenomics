<script lang="ts">
	import { enhance } from '$app/forms';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import { Mail } from 'lucide-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let useMagicLink = $state(false);
</script>

<svelte:head><title>Sign in, Mercury Tokenomics</title></svelte:head>

<div class="mx-auto max-w-md py-8">
	<div class="card p-8 sm:p-10">
		<div class="mb-6 text-center">
			<Wordmark size="lg" />
			<p class="eyebrow mt-4">Welcome back</p>
			<h1 class="text-2xl font-bold text-ink-900">Sign in</h1>
		</div>

		{#if useMagicLink}
			{#if form?.mode === 'magic' && form?.sent}
				<div class="rounded-md bg-mercury-050 p-4 text-center text-sm text-mercury-ink">
					<Mail class="mx-auto mb-2" size={20} />
					A sign-in link is on its way to <span class="data">{form.email}</span>. In local
					development the link is printed to the server console.
				</div>
			{:else}
				<form method="post" action="?/magicLink" use:enhance class="space-y-4">
					<div>
						<label class="label" for="magic-email">Email</label>
						<input
							class="input"
							id="magic-email"
							name="email"
							type="email"
							value={form?.email ?? ''}
							autocomplete="email"
						/>
					</div>
					{#if form?.mode === 'magic' && form?.message}
						<p class="text-sm text-neg">{form.message}</p>
					{/if}
					<button class="btn btn-primary w-full">Send magic link</button>
				</form>
			{/if}
			<button
				class="mt-4 w-full text-center text-sm text-ink-600 hover:text-ink-900"
				onclick={() => (useMagicLink = false)}
			>
				Use password instead
			</button>
		{:else}
			<form method="post" action="?/signIn" use:enhance class="space-y-4">
				<div>
					<label class="label" for="email">Email</label>
					<input
						class="input"
						id="email"
						name="email"
						type="email"
						value={form?.email ?? ''}
						autocomplete="email"
					/>
				</div>
				<div>
					<label class="label" for="password">Password</label>
					<input
						class="input"
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
					/>
				</div>
				{#if form?.mode === 'password' && form?.message}
					<p class="text-sm text-neg">{form.message}</p>
				{/if}
				<button class="btn btn-primary w-full">Sign in</button>
			</form>
			<button
				class="mt-4 w-full text-center text-sm text-ink-600 hover:text-ink-900"
				onclick={() => (useMagicLink = true)}
			>
				Email me a magic link instead
			</button>
		{/if}

		<p class="mt-6 text-center text-sm text-ink-600">
			No account? <a href="/signup" class="font-semibold text-ink-900">Create one</a>
		</p>
	</div>
</div>
