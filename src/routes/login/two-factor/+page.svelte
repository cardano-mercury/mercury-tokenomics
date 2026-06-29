<script lang="ts">
	import { enhance } from '$app/forms';
	import Wordmark from '$lib/components/Wordmark.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Two-factor, Mercury Tokenomics</title></svelte:head>

<div class="mx-auto max-w-md py-8">
	<div class="card p-8 sm:p-10">
		<div class="mb-6 text-center">
			<Wordmark size="lg" />
			<p class="eyebrow mt-4">One more step</p>
			<h1 class="text-2xl font-bold text-ink-900">Enter your code</h1>
			<p class="mt-2 text-sm text-ink-600">
				Open your authenticator app and enter the current six-digit code.
			</p>
		</div>

		<form method="post" use:enhance class="space-y-4">
			<div>
				<label class="label" for="code">Authentication code</label>
				<input
					class="input data text-center text-lg tracking-widest"
					id="code"
					name="code"
					inputmode="numeric"
					autocomplete="one-time-code"
					placeholder="000000"
				/>
			</div>
			<label class="flex items-center gap-2 text-sm text-ink-600">
				<input type="checkbox" name="trustDevice" />
				Trust this device for 60 days
			</label>
			{#if form?.message}
				<p class="text-sm text-neg">{form.message}</p>
			{/if}
			<button class="btn btn-primary w-full">Verify</button>
		</form>
	</div>
</div>
