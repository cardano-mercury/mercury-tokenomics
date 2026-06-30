import { env } from '$env/dynamic/private';
import { createAuth } from '@cardano-mercury/core/auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { magicLink } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendMagicLinkEmail } from '$lib/server/email';

/**
 * Better Auth for tokenomics, built from the shared mercury-core factory so the
 * email/password, two-factor, Postgres adapter, and cross-subdomain cookie
 * conventions match the other Mercury apps. Magic link and its email transport
 * stay app-side. Keep sveltekitCookies last.
 */
export const auth = createAuth({
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

/**
 * Endpoints added by the two-factor and magic-link plugins. They are registered at runtime, but
 * core's `createAuth` widens `plugins` to `any[]`, so their types are not inferred onto `auth.api`.
 * This typed view restores them for the call sites that use them.
 */
interface PluginEndpoints {
	enableTwoFactor(ctx: {
		body: { password: string; issuer?: string };
		headers: Headers;
	}): Promise<{ totpURI: string; backupCodes: string[] }>;
	verifyTOTP(ctx: {
		body: { code: string; trustDevice?: boolean };
		headers?: Headers;
	}): Promise<unknown>;
	disableTwoFactor(ctx: { body: { password: string }; headers: Headers }): Promise<unknown>;
	signInMagicLink(ctx: {
		body: { email: string; callbackURL?: string };
		headers: Headers;
	}): Promise<unknown>;
}

export const authApi = auth.api as typeof auth.api & PluginEndpoints;
