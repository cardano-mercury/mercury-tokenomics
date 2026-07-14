import { rewardAddressOf } from '@cardano-mercury/core/cardano';
import { makeControlledSet, type ControlledWalletRef } from '$lib/tokenomics/controlled';

/**
 * Server-side seam for Cardano address handling. `rewardAddressOf` parses a payment address to its
 * bech32 reward (stake) address offline, with no chain call, so it works alongside Koios. It lives
 * in `@cardano-mercury/core/cardano` because mercury-financials needs the same notion of "this
 * address is ours by stake key".
 *
 * Kept out of `$lib/tokenomics` so the domain layer stays pure and free of the Cardano
 * serialization library; `makeControlledSet` takes the resolver as an argument.
 */
export function controlledSetFor(wallets: readonly ControlledWalletRef[]) {
	return makeControlledSet(wallets, rewardAddressOf);
}

export { rewardAddressOf };
