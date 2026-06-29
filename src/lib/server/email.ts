/**
 * Outbound email. For the proof of concept there is no mail provider wired up,
 * so messages are logged to the server console. Swap the body of these
 * functions for a real transport (SMTP, Resend, SES) without touching callers.
 */

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
	console.log(`[email] magic link for ${email}: ${url}`);
}
