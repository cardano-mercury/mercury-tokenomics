import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { validateSignup } from '$lib/auth/validation';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) return redirect(302, '/dashboard');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const name = form.get('name')?.toString() ?? '';
		const email = form.get('email')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';

		const validation = validateSignup({ name, email, password });
		if (!validation.ok) return fail(400, { message: validation.message, name, email });

		try {
			await auth.api.signUpEmail({ body: { name, email, password } });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Could not create account.', name, email });
			}
			return fail(500, { message: 'Unexpected error.', name, email });
		}

		return redirect(302, '/dashboard');
	}
};
