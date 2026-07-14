import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * Outbound email.
 *
 * Magic-link sign-in is offered only where the link can actually be delivered. With `SMTP_URL` set,
 * mail goes out over SMTP. Without it, in development, the link is printed to the server console,
 * which is enough to sign in locally. Without it in production the option is hidden entirely
 * (`magicLinkAvailable`), because a link written to a container's stdout never reaches the person
 * waiting for it, and a sign-in path that silently goes nowhere is worse than one that is absent.
 *
 * Email and password, and TOTP two-factor, work regardless.
 */

const transportConfigured = Boolean(env.SMTP_URL);

/** Whether a magic link can be delivered, and so whether the UI should offer it. */
export const magicLinkAvailable = transportConfigured || dev;

const DEFAULT_FROM = 'Mercury Tokenomics <no-reply@cardano-mercury.com>';

let transport: Transporter | undefined;

// Built on first send, not at import: SvelteKit's postbuild analyse imports every server module, so
// module-scope construction would run during `npm run build`.
function getTransport(): Transporter {
	transport ??= createTransport(env.SMTP_URL);
	return transport;
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
	if (transportConfigured) {
		await getTransport().sendMail({
			from: env.MAIL_FROM || DEFAULT_FROM,
			to: email,
			subject: 'Your Mercury Tokenomics sign-in link',
			text: `Sign in to Mercury Tokenomics:\n\n${url}\n\nIf you did not request this, ignore this email.`,
			html:
				`<p>Sign in to Mercury Tokenomics:</p>` +
				`<p><a href="${url}">Sign in</a></p>` +
				`<p>If you did not request this, ignore this email.</p>`
		});
		return;
	}

	if (!dev) {
		throw new Error('No mail transport is configured, so a magic link cannot be delivered.');
	}

	console.log(`[email] magic link for ${email}: ${url}`);
}
