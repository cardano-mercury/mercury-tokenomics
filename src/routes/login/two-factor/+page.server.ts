import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { authApi } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) return redirect(302, '/dashboard');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const code = form.get('code')?.toString().trim() ?? '';
		const trustDevice = form.get('trustDevice') === 'on';

		try {
			await authApi.verifyTOTP({ body: { code, trustDevice } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: 'That code was not valid. Try again.' });
			}
			return fail(500, { message: 'Unexpected error.' });
		}

		return redirect(302, '/dashboard');
	}
};
