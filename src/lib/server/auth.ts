import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { magicLink, twoFactor } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { sendMagicLinkEmail } from '$lib/server/email';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true },
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				await sendMagicLinkEmail(email, url);
			}
		}),
		twoFactor({ issuer: 'Mercury Tokenomics' }),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
