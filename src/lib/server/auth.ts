import { env } from '$env/dynamic/private';
import { createAuth } from '@cardano-mercury/core/auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { magicLink } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendMagicLinkEmail } from '$lib/server/email';

/**
 * Better Auth for tokenomics, built from the shared mercury-core factory so the email/password,
 * two-factor, Postgres adapter, and cross-subdomain cookie conventions match the other Mercury apps.
 * Magic link and its email transport stay app-side. Keep sveltekitCookies last.
 */
function build() {
	return createAuth({
		db,
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.ORIGIN,
		issuer: 'Mercury Tokenomics',
		cookieDomain: env.COOKIE_DOMAIN || undefined,
		plugins: [
			magicLink({
				sendMagicLink: async ({ email, url }) => {
					await sendMagicLinkEmail(email, url);
				}
			}),
			sveltekitCookies(getRequestEvent)
		]
	});
}

type Auth = ReturnType<typeof build>;

let instance: Auth | undefined;

/**
 * Built on first use rather than at import.
 *
 * SvelteKit's postbuild `analyse` step imports every server module, so constructing here at module
 * scope would run during `npm run build`, where Better Auth throws without a real
 * `BETTER_AUTH_SECRET`. That would make the build require production secrets, which fails in a
 * Docker build, where there is no `.env` and there had better not be. The proxy keeps the exported
 * type and every call site (`auth.api.*`, `svelteKitHandler({ auth })`) unchanged.
 */
export const auth: Auth = new Proxy({} as Auth, {
	get(_target, prop) {
		instance ??= build();
		const value = Reflect.get(instance, prop);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});
