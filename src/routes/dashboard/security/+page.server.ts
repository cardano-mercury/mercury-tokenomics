import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { authApi } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) return redirect(302, '/login');
	const twoFactorEnabled = Boolean(
		(locals.user as { twoFactorEnabled?: boolean }).twoFactorEnabled
	);
	return { twoFactorEnabled };
};

export const actions: Actions = {
	enable: async (event) => {
		const form = await event.request.formData();
		const password = form.get('password')?.toString() ?? '';
		try {
			const result = await authApi.enableTwoFactor({
				body: { password },
				headers: event.request.headers
			});
			return {
				stage: 'setup' as const,
				totpURI: result.totpURI,
				backupCodes: result.backupCodes
			};
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { stage: 'enable', message: error.message || 'Could not enable.' });
			}
			return fail(500, { stage: 'enable', message: 'Unexpected error.' });
		}
	},

	verify: async (event) => {
		const form = await event.request.formData();
		const code = form.get('code')?.toString().trim() ?? '';
		try {
			await authApi.verifyTOTP({ body: { code }, headers: event.request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { stage: 'verify', message: 'That code was not valid.' });
			}
			return fail(500, { stage: 'verify', message: 'Unexpected error.' });
		}
		return redirect(302, '/dashboard/security');
	},

	disable: async (event) => {
		const form = await event.request.formData();
		const password = form.get('password')?.toString() ?? '';
		try {
			await authApi.disableTwoFactor({ body: { password }, headers: event.request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { stage: 'disable', message: error.message || 'Could not disable.' });
			}
			return fail(500, { stage: 'disable', message: 'Unexpected error.' });
		}
		return redirect(302, '/dashboard/security');
	}
};
