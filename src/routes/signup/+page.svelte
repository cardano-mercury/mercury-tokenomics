<script lang="ts">
	import { enhance } from '$app/forms';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Create account, Mercury Tokenomics</title></svelte:head>

<div class="mx-auto max-w-md py-8">
	<div class="card p-8 sm:p-10">
		<div class="mb-6 text-center">
			<Wordmark size="lg" />
			<p class="eyebrow mt-4">Get started</p>
			<h1 class="text-2xl font-bold text-ink-900">Create your account</h1>
		</div>

		<form method="post" use:enhance class="space-y-4">
			<div>
				<label class="label" for="name">Name</label>
				<input class="input" id="name" name="name" value={form?.name ?? ''} autocomplete="name" />
			</div>
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
					autocomplete="new-password"
				/>
			</div>

			{#if form?.message}
				<p class="text-sm text-neg">{form.message}</p>
			{/if}

			<button class="btn btn-primary w-full">Create account</button>
		</form>

		<p class="mt-6 text-center text-sm text-ink-600">
			Already have an account? <a href="/login" class="font-semibold text-ink-900">Sign in</a>
		</p>
	</div>
</div>
