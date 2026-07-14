<script lang="ts">
	import { enhance } from '$app/forms';
	import { Link2, ShieldCheck } from 'lucide-svelte';
	import { truncateMiddle } from '$lib/format';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Anchor declaration, {data.projectName}</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<p class="eyebrow">{data.projectName}</p>
	<h1 class="mb-2 text-2xl font-bold text-ink-900">Anchor the declaration</h1>
	<p class="mb-6 text-sm text-ink-600">
		Publishing the declaration to Cardano metadata makes it timestamped and tamper-evident. Attach
		the metadata below to a transaction under label {data.metadataLabel}, submit it from a wallet
		you control, then record the transaction hash here.
	</p>

	{#if data.latest}
		<div class="card mb-6 flex items-center gap-3 p-4">
			<ShieldCheck class="text-pos" size={20} />
			<p class="text-sm text-ink-600">
				Currently anchored at v{data.latest.version}, hash
				<span class="data">{truncateMiddle(data.latest.hash, 10, 8)}</span>.
			</p>
		</div>
	{/if}

	<section class="card p-8">
		<h2 class="text-lg font-semibold text-ink-900">Version {data.nextVersion}</h2>
		<p class="label mt-4">Declaration hash (blake2b-256)</p>
		<div class="data break-all rounded-md bg-ink-100 p-3 text-xs">{data.hash}</div>

		<p class="label mt-4">Metadata to publish (label {data.metadataLabel})</p>
		<pre class="data overflow-x-auto rounded-md bg-ink-100 p-3 text-xs">{data.metadataJson}</pre>

		<details class="mt-4">
			<summary class="cursor-pointer text-sm text-ink-600">Show canonical declaration</summary>
			<pre
				class="data mt-2 overflow-x-auto rounded-md bg-ink-100 p-3 text-xs">{data.canonical}</pre>
		</details>
	</section>

	<section class="card mt-6 p-8">
		<h2 class="mb-1 text-lg font-semibold text-ink-900">Record the anchor</h2>
		<p class="mb-4 text-sm text-ink-600">
			After submitting the metadata transaction, paste its hash to record this anchor.
		</p>
		<form method="post" action="?/record" use:enhance class="space-y-4">
			<div>
				<label class="label" for="txHash">Transaction hash</label>
				<input class="input data" id="txHash" name="txHash" placeholder="64 hex characters" />
			</div>
			<div>
				<label class="label" for="payloadUri">Payload URI (optional)</label>
				<input class="input" id="payloadUri" name="payloadUri" placeholder="https://" />
			</div>
			{#if form?.message}
				<p class="text-sm text-neg">{form.message}</p>
			{/if}
			<div class="flex items-center justify-between">
				<a href="/dashboard/projects/{data.id}" class="text-sm text-ink-600">Back</a>
				<button class="btn btn-affirmative">
					<Link2 size={18} /> Record anchor v{data.nextVersion}
				</button>
			</div>
		</form>
	</section>
</div>
