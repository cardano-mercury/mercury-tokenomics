import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { isValidEmail } from '$lib/auth/validation';
import { magicLinkAvailable } from '$lib/server/email';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) return redirect(302, '/dashboard');
	return { magicLinkAvailable };
};

export const actions: Actions = {
	signIn: async (event) => {
		const form = await event.request.formData();
		const email = form.get('email')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';

		try {
			const result = await auth.api.signInEmail({ body: { email, password } });
			if (result && 'twoFactorRedirect' in result && result.twoFactorRedirect) {
				return redirect(302, '/login/two-factor');
			}
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { mode: 'password', message: 'Invalid email or password.', email });
			}
			return fail(500, { mode: 'password', message: 'Unexpected error.', email });
		}

		return redirect(302, '/dashboard');
	},

	magicLink: async (event) => {
		// The UI hides this option when no transport can deliver, but the action is still reachable
		// by a direct POST, so refuse rather than report a link sent that never leaves the server.
		if (!magicLinkAvailable) {
			return fail(400, {
				mode: 'magic',
				message: 'Magic-link sign-in is not available. Use your email and password.',
				email: ''
			});
		}

		const form = await event.request.formData();
		const email = form.get('email')?.toString() ?? '';
		if (!isValidEmail(email)) {
			return fail(400, { mode: 'magic', message: 'Please enter a valid email.', email });
		}

		try {
			await auth.api.signInMagicLink({
				body: { email, callbackURL: '/dashboard' },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					mode: 'magic',
					message: error.message || 'Could not send link.',
					email
				});
			}
			return fail(500, { mode: 'magic', message: 'Unexpected error.', email });
		}

		return { mode: 'magic', sent: true, email };
	}
};
