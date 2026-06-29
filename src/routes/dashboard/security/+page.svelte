<script lang="ts">
	import { enhance } from '$app/forms';
	import { ShieldCheck, ShieldOff } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Security, Mercury Tokenomics</title></svelte:head>

<div class="mx-auto max-w-xl">
	<p class="eyebrow">Account</p>
	<h1 class="mb-6 text-2xl font-bold text-ink-900">Security</h1>

	<div class="card p-8">
		<div class="mb-4 flex items-center gap-3">
			{#if data.twoFactorEnabled}
				<ShieldCheck class="text-pos" size={22} />
				<h2 class="text-lg font-semibold text-ink-900">Two-factor is on</h2>
			{:else}
				<ShieldOff class="text-ink-400" size={22} />
				<h2 class="text-lg font-semibold text-ink-900">Two-factor authentication</h2>
			{/if}
		</div>

		{#if form?.stage === 'setup'}
			<p class="text-sm text-ink-600">
				Add this secret to your authenticator app, then enter a code to confirm.
			</p>
			<div class="my-4 break-all rounded-md bg-ink-100 p-3">
				<span class="data text-xs">{form.totpURI}</span>
			</div>
			{#if form.backupCodes?.length}
				<p class="label">Backup codes (store these safely)</p>
				<div class="mb-4 grid grid-cols-2 gap-1">
					{#each form.backupCodes as code (code)}
						<span class="data text-xs text-ink-600">{code}</span>
					{/each}
				</div>
			{/if}
			<form method="post" action="?/verify" use:enhance class="space-y-3">
				<input
					class="input data text-center tracking-widest"
					name="code"
					inputmode="numeric"
					placeholder="000000"
				/>
				{#if form?.message}
					<p class="text-sm text-neg">{form.message}</p>
				{/if}
				<button class="btn btn-affirmative w-full">Confirm and turn on</button>
			</form>
		{:else if data.twoFactorEnabled}
			<p class="mb-4 text-sm text-ink-600">
				Your account is protected by an authenticator code at sign-in.
			</p>
			<form method="post" action="?/disable" use:enhance class="space-y-3">
				<div>
					<label class="label" for="disable-pw">Confirm password to turn off</label>
					<input class="input" id="disable-pw" name="password" type="password" />
				</div>
				{#if form?.message}
					<p class="text-sm text-neg">{form.message}</p>
				{/if}
				<button class="btn btn-destructive">Turn off two-factor</button>
			</form>
		{:else}
			<p class="mb-4 text-sm text-ink-600">
				Add an authenticator app for a second layer of protection at sign-in.
			</p>
			<form method="post" action="?/enable" use:enhance class="space-y-3">
				<div>
					<label class="label" for="enable-pw">Confirm password</label>
					<input class="input" id="enable-pw" name="password" type="password" />
				</div>
				{#if form?.message}
					<p class="text-sm text-neg">{form.message}</p>
				{/if}
				<button class="btn btn-primary">Set up two-factor</button>
			</form>
		{/if}
	</div>

	<p class="mt-6 text-sm">
		<a href="/dashboard" class="text-ink-600 hover:text-ink-900">Back to dashboard</a>
	</p>
</div>
