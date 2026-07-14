<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	const v = $derived(form?.values);
</script>

<svelte:head><title>New project, Mercury Tokenomics</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<p class="eyebrow">New project</p>
	<h1 class="mb-6 text-2xl font-bold text-ink-900">Describe your token</h1>

	<form method="post" use:enhance class="card space-y-5 p-8">
		<div>
			<label class="label" for="name">Project name</label>
			<input
				class="input"
				id="name"
				name="name"
				value={v?.name ?? ''}
				placeholder="Acme Protocol"
			/>
		</div>

		<div>
			<label class="label" for="policyId">Token policy id</label>
			<input
				class="input data"
				id="policyId"
				name="policyId"
				value={v?.policyId ?? ''}
				placeholder="56 hex characters"
			/>
		</div>

		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<label class="label" for="assetNameHex">Asset name (hex, optional)</label>
				<input
					class="input data"
					id="assetNameHex"
					name="assetNameHex"
					value={v?.assetNameHex ?? ''}
					placeholder="e.g. 41434d45"
				/>
			</div>
			<div>
				<label class="label" for="decimals">Decimals</label>
				<input
					class="input"
					id="decimals"
					name="decimals"
					type="number"
					min="0"
					max="30"
					value={v?.decimals ?? '0'}
				/>
			</div>
		</div>

		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<label class="label" for="totalSupply">Total supply (base units)</label>
				<input
					class="input data"
					id="totalSupply"
					name="totalSupply"
					value={v?.totalSupply ?? ''}
					placeholder="whole number"
				/>
			</div>
			<div>
				<label class="label" for="t0">Token generation date (T0)</label>
				<input class="input" id="t0" name="t0" type="date" value={v?.t0 ?? ''} />
			</div>
		</div>

		<div>
			<label class="label" for="network">Network</label>
			<select class="input" id="network" name="network" value={v?.network ?? 'preprod'}>
				<option value="preprod">Preprod (testnet)</option>
				<option value="preview">Preview (testnet)</option>
				<option value="mainnet">Mainnet</option>
			</select>
		</div>

		<div>
			<label class="label" for="website">Website (optional)</label>
			<input class="input" id="website" name="website" placeholder="https://" />
		</div>

		<div>
			<label class="label" for="description">Description (optional)</label>
			<textarea class="input" id="description" name="description" rows="3"></textarea>
		</div>

		{#if form?.message}
			<p class="text-sm text-neg">{form.message}</p>
		{/if}

		<div class="flex items-center justify-end gap-3">
			<a href="/dashboard" class="btn btn-ghost">Cancel</a>
			<button class="btn btn-affirmative">Create project</button>
		</div>
	</form>
</div>
