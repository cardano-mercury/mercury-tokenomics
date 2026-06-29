/**
 * Pure validation for auth form input, kept separate from the server actions so
 * it can be unit tested. Returns the first problem found, or ok.
 */

export interface SignupInput {
	name: string;
	email: string;
	password: string;
}

export type ValidationResult = { ok: true } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_RE.test(email);
}

export function validateSignup(input: SignupInput): ValidationResult {
	const name = input.name.trim();
	if (name.length < 2) return { ok: false, message: 'Please enter your name.' };
	if (!isValidEmail(input.email)) return { ok: false, message: 'Please enter a valid email.' };
	if (input.password.length < 8) {
		return { ok: false, message: 'Password must be at least 8 characters.' };
	}
	return { ok: true };
}
