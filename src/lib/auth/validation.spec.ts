import { describe, it, expect } from 'vitest';
import { isValidEmail, validateSignup } from './validation';

describe('isValidEmail', () => {
	it('accepts well-formed addresses', () => {
		expect(isValidEmail('adam@crypto2099.io')).toBe(true);
	});

	it('rejects malformed addresses', () => {
		expect(isValidEmail('adam')).toBe(false);
		expect(isValidEmail('adam@')).toBe(false);
		expect(isValidEmail('adam@io')).toBe(false);
		expect(isValidEmail('a b@c.io')).toBe(false);
		expect(isValidEmail('')).toBe(false);
	});
});

describe('validateSignup', () => {
	const valid = { name: 'Adam', email: 'adam@crypto2099.io', password: 'longenough' };

	it('passes a complete, valid signup', () => {
		expect(validateSignup(valid)).toEqual({ ok: true });
	});

	it('rejects a missing or too-short name', () => {
		expect(validateSignup({ ...valid, name: ' ' })).toEqual({
			ok: false,
			message: 'Please enter your name.'
		});
	});

	it('rejects an invalid email', () => {
		expect(validateSignup({ ...valid, email: 'nope' })).toEqual({
			ok: false,
			message: 'Please enter a valid email.'
		});
	});

	it('rejects a short password', () => {
		expect(validateSignup({ ...valid, password: 'short' })).toEqual({
			ok: false,
			message: 'Password must be at least 8 characters.'
		});
	});

	it('reports the name problem before the email problem', () => {
		const result = validateSignup({ name: '', email: 'bad', password: 'x' });
		expect(result).toEqual({ ok: false, message: 'Please enter your name.' });
	});
});
