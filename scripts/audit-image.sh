#!/usr/bin/env sh
# Fails if an image carries a secret.
#
# Two things this got wrong elsewhere and does not get wrong here:
#
#   - It COUNTS matches. `grep ... | head` succeeds whatever grep found, so `&& echo LEAKED` fires
#     even when nothing matched. The count is compared to zero.
#   - It matches sensitive KEYS, not every long-looking value. A scanner that flags
#     REDIS_URL=redis://localhost:6379 gets switched off, and then it is not a scanner.
#
# The real defence is that the Dockerfile copies only what it needs, and that .dockerignore is read
# from the build context root (NOT from beside the Dockerfile: financials shipped a live mainnet key
# into an image exactly that way, and the image worked *because* the secret was in it, which hid a
# separate bug). This is the check that the defence held.
#
# Usage: scripts/audit-image.sh <image> [<image>...]

set -eu

status=0

for image in "$@"; do
	printf 'auditing %s\n' "$image"

	# A real .env must never be in an image. .env.example is fine and is deliberately not ignored.
	envs=$(docker run --rm --entrypoint sh "$image" -c \
		'find / -name ".env" -not -path "/proc/*" -not -path "/sys/*" 2>/dev/null | wc -l')
	printf '  .env files: %s\n' "$envs"
	if [ "$envs" -ne 0 ]; then
		printf '  FAIL: the image contains a .env\n'
		status=1
	fi

	# Sensitive keys with a value assigned. Matches the key, so a placeholder or an empty value does
	# not trip it.
	#
	# Scoped to our own files. A dependency's README that documents `BETTER_AUTH_SECRET=...` is not a
	# leak, and the first version of this script failed the build over exactly that. Documentation and
	# examples are excluded for the same reason: what matters is a secret in code or configuration
	# that ships.
	keys='(BETTER_AUTH_SECRET|SMTP_URL|DATABASE_URL|BLOCKFROST_PROJECT_ID|POSTGRES_PASSWORD)=..*'
	find_ours='find /app -type f -not -path "*/node_modules/*" -not -name "*.md" -not -name ".env.example"'

	hits=$(docker run --rm --entrypoint sh -e KEYS="$keys" -e FIND="$find_ours" "$image" -c \
		'sh -c "$FIND" 2>/dev/null | xargs -r grep -lE "$KEYS" 2>/dev/null | wc -l')
	printf '  files assigning a secret key: %s\n' "$hits"
	if [ "$hits" -ne 0 ]; then
		printf '  FAIL: a secret value is baked into the image\n'
		docker run --rm --entrypoint sh -e KEYS="$keys" -e FIND="$find_ours" "$image" -c \
			'sh -c "$FIND" 2>/dev/null | xargs -r grep -lE "$KEYS" 2>/dev/null'
		status=1
	fi
done

if [ "$status" -eq 0 ]; then
	printf 'clean\n'
fi

exit "$status"
