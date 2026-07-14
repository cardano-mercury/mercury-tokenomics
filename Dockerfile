# Mercury: Tokenomics production image.
#
#   docker build -t mercury-tokenomics .
#
# An ordinary single-context build: @cardano-mercury/core comes from npm, so this repo is the whole
# context and no sibling checkout is needed.

FROM node:22-alpine AS base
WORKDIR /app


FROM base AS builder

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


# Migration stage: a one-shot, run before the app starts, not the image that serves traffic.
#
#   docker run --rm -e DATABASE_URL=... mercury-tokenomics-migrate
#
# Deliberately NOT built on `builder`. It needs only the migration SQL, the two scripts, and the two
# packages they import, so carrying the dev toolchain and the app build just to run for two seconds
# made this the largest thing the demo host pulls. Built from `base` instead.
#
# This is also the SEED image: the runner carries only build/ and cannot seed itself, so the runbook
# seeds with `run --rm --entrypoint sh tokenomics-migrate -c 'node scripts/seed.mjs'`. scripts/ is
# copied whole to keep that working.
#
# It applies ONLY tokenomics' own tokenomics_* tables. The shared auth tables belong to core and must
# already exist: tokenomics_project.owner_id foreign-keys to "user", so
# `npx @cardano-mercury/core migrate` has to have run first or this fails.
FROM base AS migrate

ENV NODE_ENV=production

# Both scripts import only `postgres` (the driver) and, for the migrator, `drizzle-orm`. drizzle-orm
# is a devDependency of the app (adapter-node bundles it into build/, so the runner never needs it),
# but scripts/migrate.mjs imports it at runtime, so it is installed explicitly here. Versions are
# read out of the app's package.json so they cannot drift from it.
#
# The app's package.json is read from /tmp and a minimal manifest is written in its place: `npm
# install <pkg>` also installs everything in the package.json it finds in the working directory, so
# copying the real one here would drag in the whole app tree (MeshJS, the Cardano SDKs, the lot) and
# defeat the point of this stage. --legacy-peer-deps keeps drizzle-orm's large set of optional
# driver peers out for the same reason.
COPY package.json /tmp/app-package.json
RUN printf '{"name":"tokenomics-migrate","private":true,"type":"module"}\n' > package.json \
	&& npm install --no-save --no-package-lock --omit=optional --legacy-peer-deps \
	"postgres@$(node -p "require('/tmp/app-package.json').dependencies.postgres")" \
	"drizzle-orm@$(node -p "require('/tmp/app-package.json').devDependencies['drizzle-orm']")" \
	&& rm /tmp/app-package.json \
	&& npm cache clean --force

COPY drizzle ./drizzle
COPY scripts ./scripts

USER node

CMD ["node", "scripts/migrate.mjs"]


# Runtime: production dependencies only, plus the built server.
FROM base AS runner

ENV NODE_ENV=production

# adapter-node externalises anything in `dependencies`, so those must be present at runtime;
# `devDependencies` (drizzle-orm, svelte) are bundled into build/ and are not needed here.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/build ./build

# The Node server binds this; Caddy reaches it on the internal network, so it is never published.
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Behind a TLS-terminating proxy, adapter-node needs to be told which headers carry the real
# protocol and host. Without these it builds absolute URLs as http://tokenomics:3000, and Better
# Auth then rejects its own callbacks as cross-origin. This is the single most common way the
# proxied setup breaks, so it is baked in rather than left to the compose file.
ENV PROTOCOL_HEADER=x-forwarded-proto
ENV HOST_HEADER=x-forwarded-host

# Run unprivileged. The node image ships a `node` user for exactly this.
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "build"]
