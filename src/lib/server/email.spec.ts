import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `magicLinkAvailable` decides whether the sign-in UI offers magic links at all. Getting it wrong in
 * production means advertising a sign-in path whose link is written to a container's stdout and
 * never reaches anyone, so each environment is pinned here.
 *
 * The flag is resolved at module load, so every case re-imports the module with fresh mocks.
 */

const sendMail = vi.fn();

async function loadEmail(opts: { dev: boolean; smtpUrl?: string; from?: string }) {
	vi.resetModules();
	sendMail.mockReset().mockResolvedValue({ messageId: 'x' });
	vi.doMock('$app/environment', () => ({ dev: opts.dev }));
	vi.doMock('$env/dynamic/private', () => ({
		env: {
			...(opts.smtpUrl ? { SMTP_URL: opts.smtpUrl } : {}),
			...(opts.from ? { MAIL_FROM: opts.from } : {})
		}
	}));
	vi.doMock('nodemailer', () => ({ createTransport: () => ({ sendMail }) }));
	return import('./email');
}

describe('magic link availability', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('is available in development, where the link goes to the console', async () => {
		const { magicLinkAvailable } = await loadEmail({ dev: true });

		expect(magicLinkAvailable).toBe(true);
	});

	it('is unavailable in production with no transport, so the UI does not offer it', async () => {
		const { magicLinkAvailable } = await loadEmail({ dev: false });

		expect(magicLinkAvailable).toBe(false);
	});

	it('is available in production once a transport is configured', async () => {
		const { magicLinkAvailable } = await loadEmail({ dev: false, smtpUrl: 'smtp://localhost:25' });

		expect(magicLinkAvailable).toBe(true);
	});
});

describe('sendMagicLinkEmail', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('logs the link in development', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const { sendMagicLinkEmail } = await loadEmail({ dev: true });

		await sendMagicLinkEmail('a@b.test', 'https://example.test/magic');

		expect(log).toHaveBeenCalledWith(expect.stringContaining('https://example.test/magic'));
	});

	it('refuses to silently drop the message in production with no transport', async () => {
		const { sendMagicLinkEmail } = await loadEmail({ dev: false });

		await expect(sendMagicLinkEmail('a@b.test', 'https://example.test/magic')).rejects.toThrow(
			/no mail transport is configured/i
		);
	});

	it('sends over SMTP when a transport is configured', async () => {
		const { sendMagicLinkEmail } = await loadEmail({
			dev: false,
			smtpUrl: 'smtp://localhost:1025'
		});

		await sendMagicLinkEmail('a@b.test', 'https://example.test/magic');

		expect(sendMail).toHaveBeenCalledTimes(1);
		const message = sendMail.mock.calls[0][0];
		expect(message.to).toBe('a@b.test');
		expect(message.text).toContain('https://example.test/magic');
		expect(message.html).toContain('https://example.test/magic');
	});

	it('honours MAIL_FROM, falling back to a default sender', async () => {
		const custom = await loadEmail({
			dev: false,
			smtpUrl: 'smtp://localhost:1025',
			from: 'Team <team@example.test>'
		});
		await custom.sendMagicLinkEmail('a@b.test', 'https://example.test/m');
		expect(sendMail.mock.calls[0][0].from).toBe('Team <team@example.test>');

		const fallback = await loadEmail({ dev: false, smtpUrl: 'smtp://localhost:1025' });
		await fallback.sendMagicLinkEmail('a@b.test', 'https://example.test/m');
		expect(sendMail.mock.calls[0][0].from).toContain('no-reply@');
	});

	it('prefers SMTP over the console even in development', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const { sendMagicLinkEmail } = await loadEmail({ dev: true, smtpUrl: 'smtp://localhost:1025' });

		await sendMagicLinkEmail('a@b.test', 'https://example.test/magic');

		expect(sendMail).toHaveBeenCalledTimes(1);
		expect(log).not.toHaveBeenCalled();
	});

	it('never reports success for a message it did not send', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const { sendMagicLinkEmail } = await loadEmail({ dev: false });

		await expect(sendMagicLinkEmail('a@b.test', 'https://example.test/magic')).rejects.toThrow();
		expect(log).not.toHaveBeenCalled();
	});
});
