<script lang="ts">
	import { enhance } from '$app/forms';
	import { Trash2, ExternalLink, Wallet, RefreshCw } from 'lucide-svelte';
	import { formatAmount, formatDateISO, truncateMiddle } from '$lib/format';
	import { VESTING_TYPES } from '$lib/projects/validation';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const decimals = $derived(data.project.decimals);
	const totalAllocated = $derived(data.buckets.reduce((sum, b) => sum + BigInt(b.allocation), 0n));
	const t0Value = $derived(formatDateISO(new Date(data.project.t0)));
</script>

<svelte:head><title>{data.project.name}, Mercury Tokenomics</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="eyebrow">Project</p>
		<h1 class="text-2xl font-bold text-ink-900">{data.project.name}</h1>
	</div>
	<a href="/p/{data.project.slug}" class="btn btn-ghost">
		<ExternalLink size={18} /> View public statement
	</a>
</div>

<!-- Project details -->
<section class="card mt-8 p-8">
	<h2 class="mb-4 text-lg font-semibold text-ink-900">Details</h2>
	<form method="post" action="?/updateProject" use:enhance class="space-y-5">
		<div>
			<label class="label" for="name">Project name</label>
			<input class="input" id="name" name="name" value={data.project.name} />
		</div>
		<div>
			<label class="label" for="policyId">Policy id</label>
			<input class="input data" id="policyId" name="policyId" value={data.project.policyId} />
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<label class="label" for="assetNameHex">Asset name (hex)</label>
				<input
					class="input data"
					id="assetNameHex"
					name="assetNameHex"
					value={data.project.assetNameHex}
				/>
			</div>
			<div>
				<label class="label" for="decimals">Decimals</label>
				<input
					class="input"
					id="decimals"
					name="decimals"
					type="number"
					value={data.project.decimals}
				/>
			</div>
		</div>
		<div class="grid gap-5 sm:grid-cols-3">
			<div>
				<label class="label" for="totalSupply">Total supply (base units)</label>
				<input
					class="input data"
					id="totalSupply"
					name="totalSupply"
					value={data.project.totalSupply}
				/>
			</div>
			<div>
				<label class="label" for="t0">Token generation date</label>
				<input class="input" id="t0" name="t0" type="date" value={t0Value} />
			</div>
			<div>
				<label class="label" for="network">Network</label>
				<select class="input" id="network" name="network" value={data.project.network}>
					<option value="preprod">Preprod</option>
					<option value="preview">Preview</option>
					<option value="mainnet">Mainnet</option>
				</select>
			</div>
		</div>
		<div>
			<label class="label" for="website">Website</label>
			<input class="input" id="website" name="website" value={data.project.website ?? ''} />
		</div>
		<div>
			<label class="label" for="description">Description</label>
			<textarea class="input" id="description" name="description" rows="3"
				>{data.project.description ?? ''}</textarea
			>
		</div>
		{#if form?.scope === 'project' && form?.message}
			<p class="text-sm text-neg">{form.message}</p>
		{:else if form?.scope === 'project' && form?.ok}
			<p class="text-sm text-pos">Saved.</p>
		{/if}
		<div class="flex justify-end">
			<button class="btn btn-primary">Save details</button>
		</div>
	</form>
</section>

<!-- Buckets -->
<section class="card mt-6 p-8">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-ink-900">Buckets</h2>
		<span class="data text-xs text-ink-400">
			Allocated {formatAmount(totalAllocated, decimals)} of {formatAmount(
				BigInt(data.project.totalSupply),
				decimals
			)}
		</span>
	</div>

	{#if data.buckets.length}
		<div class="mb-6 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-ink-400">
						<th class="py-2 font-normal">Name</th>
						<th class="py-2 text-right font-normal">Allocation</th>
						<th class="py-2 text-right font-normal">First unlock</th>
						<th class="py-2 text-right font-normal">Cliff</th>
						<th class="py-2 text-right font-normal">Vesting</th>
						<th class="py-2 font-normal">Type</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.buckets as b (b.id)}
						<tr class="border-t border-ink-100">
							<td class="py-2 text-ink-900">{b.name}</td>
							<td class="data py-2 text-right">{formatAmount(BigInt(b.allocation), decimals)}</td>
							<td class="data py-2 text-right">{formatAmount(BigInt(b.firstUnlock), decimals)}</td>
							<td class="data py-2 text-right">{b.cliffMonths}m</td>
							<td class="data py-2 text-right">{b.vestingMonths}m</td>
							<td class="py-2 text-ink-600">{b.vestingType}</td>
							<td class="py-2 text-right">
								<form method="post" action="?/deleteBucket" use:enhance>
									<input type="hidden" name="bucketId" value={b.id} />
									<button class="text-ink-400 hover:text-neg" aria-label="Delete bucket">
										<Trash2 size={16} />
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="mb-6 text-sm text-ink-600">No buckets yet. Add the first one below.</p>
	{/if}

	<form method="post" action="?/addBucket" use:enhance class="grid items-end gap-3 sm:grid-cols-6">
		<div class="sm:col-span-2">
			<label class="label" for="b-name">Name</label>
			<input class="input" id="b-name" name="name" placeholder="Team" />
		</div>
		<div>
			<label class="label" for="b-alloc">Allocation</label>
			<input class="input data" id="b-alloc" name="allocation" placeholder="0" />
		</div>
		<div>
			<label class="label" for="b-first">First unlock</label>
			<input class="input data" id="b-first" name="firstUnlock" placeholder="0" />
		</div>
		<div>
			<label class="label" for="b-cliff">Cliff (mo)</label>
			<input class="input" id="b-cliff" name="cliffMonths" type="number" min="0" value="0" />
		</div>
		<div>
			<label class="label" for="b-vest">Vesting (mo)</label>
			<input class="input" id="b-vest" name="vestingMonths" type="number" min="0" value="0" />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="b-type">Vesting type</label>
			<select class="input" id="b-type" name="vestingType">
				{#each VESTING_TYPES as t (t)}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</div>
		<div class="sm:col-span-2 sm:col-start-5 sm:justify-self-end">
			<button class="btn btn-affirmative w-full sm:w-auto">Add bucket</button>
		</div>
	</form>
	{#if form?.scope === 'bucket' && form?.message}
		<p class="mt-3 text-sm text-neg">{form.message}</p>
	{/if}
</section>

<!-- Wallets -->
<section class="card mt-6 p-8">
	<h2 class="mb-1 text-lg font-semibold text-ink-900">Controlled wallets</h2>
	<p class="mb-4 text-sm text-ink-600">
		Addresses the project controls. Transfers between these addresses are internal; transfers
		leaving this set count as delivered.
	</p>

	{#if data.wallets.length}
		<div class="mb-6 space-y-2">
			{#each data.wallets as w (w.id)}
				{@const bucketName = data.buckets.find((b) => b.id === w.bucketId)?.name}
				<div class="flex items-center justify-between rounded-md border border-ink-100 px-4 py-3">
					<div class="flex items-center gap-3">
						<Wallet class="text-ink-400" size={18} />
						<div>
							<p class="data text-sm text-ink-900">{truncateMiddle(w.address, 12, 8)}</p>
							<p class="text-xs text-ink-400">
								{w.label || 'Unlabeled'}{bucketName ? ` · ${bucketName}` : ''} · {w.verifiedAt
									? 'verified'
									: 'unverified'}
							</p>
						</div>
					</div>
					<form method="post" action="?/deleteWallet" use:enhance>
						<input type="hidden" name="walletId" value={w.id} />
						<button class="text-ink-400 hover:text-neg" aria-label="Remove wallet">
							<Trash2 size={16} />
						</button>
					</form>
				</div>
			{/each}
		</div>
	{:else}
		<p class="mb-6 text-sm text-ink-600">No wallets yet.</p>
	{/if}

	<form method="post" action="?/addWallet" use:enhance class="grid items-end gap-3 sm:grid-cols-6">
		<div class="sm:col-span-3">
			<label class="label" for="w-address">Address</label>
			<input class="input data" id="w-address" name="address" placeholder="addr1..." />
		</div>
		<div>
			<label class="label" for="w-label">Label</label>
			<input class="input" id="w-label" name="label" placeholder="Treasury" />
		</div>
		<div>
			<label class="label" for="w-bucket">Bucket</label>
			<select class="input" id="w-bucket" name="bucketId">
				<option value="">None</option>
				{#each data.buckets as b (b.id)}
					<option value={b.id}>{b.name}</option>
				{/each}
			</select>
		</div>
		<div class="sm:justify-self-end">
			<button class="btn btn-affirmative w-full sm:w-auto">Add wallet</button>
		</div>
	</form>
	{#if form?.scope === 'wallet' && form?.message}
		<p class="mt-3 text-sm text-neg">{form.message}</p>
	{/if}
</section>

<!-- Chain data -->
<section class="card mt-6 p-8">
	<div class="mb-1 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-ink-900">Token movements</h2>
		<form method="post" action="?/syncChain" use:enhance>
			<button class="btn btn-ghost">
				<RefreshCw size={16} /> Sync from chain
			</button>
		</form>
	</div>
	<p class="mb-4 text-sm text-ink-600">
		Sync pulls external outflows from Koios for the declared wallets. You can also record movements
		manually. These feed the Delivered side of the statement.
	</p>

	{#if form?.scope === 'chain' && form?.message}
		<p class="mb-4 text-sm text-neg">{form.message}</p>
	{:else if form?.scope === 'chain' && form?.ok}
		<p class="mb-4 text-sm text-pos">
			Synced {form.synced} movement{form.synced === 1 ? '' : 's'} from {form.scanned} transactions.
		</p>
	{/if}

	{#if data.movements.length}
		<div class="mb-6 overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-ink-400">
						<th class="py-2 font-normal">Date</th>
						<th class="py-2 font-normal">Bucket</th>
						<th class="py-2 font-normal">Direction</th>
						<th class="py-2 text-right font-normal">Amount</th>
						<th class="py-2 font-normal">Source</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each data.movements as m (m.id)}
						{@const bucketName = data.buckets.find((b) => b.id === m.bucketId)?.name}
						<tr class="border-t border-ink-100">
							<td class="data py-2 text-ink-600">{formatDateISO(new Date(m.occurredAt))}</td>
							<td class="py-2 text-ink-900">{bucketName ?? 'Unassigned'}</td>
							<td class="py-2 {m.direction === 'out' ? 'text-neg' : 'text-pos'}">
								{m.direction === 'out' ? 'Outflow' : 'Inbound'}
							</td>
							<td class="data py-2 text-right">{formatAmount(BigInt(m.amount), decimals)}</td>
							<td class="py-2 text-ink-400">{m.source}</td>
							<td class="py-2 text-right">
								<form method="post" action="?/deleteMovement" use:enhance>
									<input type="hidden" name="movementId" value={m.id} />
									<button class="text-ink-400 hover:text-neg" aria-label="Delete movement">
										<Trash2 size={16} />
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="mb-6 text-sm text-ink-600">No movements recorded yet.</p>
	{/if}

	<form
		method="post"
		action="?/addMovement"
		use:enhance
		class="grid items-end gap-3 sm:grid-cols-5"
	>
		<div>
			<label class="label" for="m-date">Date</label>
			<input class="input" id="m-date" name="occurredAt" type="date" />
		</div>
		<div>
			<label class="label" for="m-bucket">Bucket</label>
			<select class="input" id="m-bucket" name="bucketId">
				<option value="">Unassigned</option>
				{#each data.buckets as b (b.id)}
					<option value={b.id}>{b.name}</option>
				{/each}
			</select>
		</div>
		<div>
			<label class="label" for="m-dir">Direction</label>
			<select class="input" id="m-dir" name="direction">
				<option value="out">Outflow</option>
				<option value="in">Inbound</option>
			</select>
		</div>
		<div>
			<label class="label" for="m-amount">Amount (base units)</label>
			<input class="input data" id="m-amount" name="amount" placeholder="0" />
		</div>
		<div class="sm:justify-self-end">
			<button class="btn btn-affirmative w-full sm:w-auto">Add movement</button>
		</div>
	</form>
	{#if form?.scope === 'movement' && form?.message}
		<p class="mt-3 text-sm text-neg">{form.message}</p>
	{/if}
</section>
