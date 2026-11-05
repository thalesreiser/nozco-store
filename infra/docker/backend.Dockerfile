# Backend image: Medusa server and admin, built from the repository root.
#   docker build -f infra/docker/backend.Dockerfile -t nozco-backend .
# The same image runs the API (default) or the worker (MEDUSA_WORKER_MODE=worker). All configuration
# comes from the environment at run time: see apps/backend/.env.example.

ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    TURBO_TELEMETRY_DISABLED=1 \
    MEDUSA_DISABLE_TELEMETRY=true
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@nozco/backend..."
# `medusa build` loads medusa-config.ts, and src/lib/env.ts rejects a production environment without
# these variables. The values are placeholders, not secrets, and exist for this one command: they are
# neither ENV nor ARG, and this stage is not part of the final image. CI checks that they do not ship.
RUN NODE_ENV=production \
    DATABASE_URL=postgres://build-time-placeholder@localhost:5432/build-time-placeholder \
    STORE_CORS=http://build-time-placeholder \
    ADMIN_CORS=http://build-time-placeholder \
    AUTH_CORS=http://build-time-placeholder \
    JWT_SECRET=build-time-placeholder-build-time-placeholder \
    COOKIE_SECRET=build-time-placeholder-build-time-placeholder \
    pnpm --filter @nozco/backend build
# The image gets only the compiled app (.medusa/server) and production node_modules. `pnpm deploy` also
# copies the TypeScript sources, which must not ship: Medusa would try to load them.
RUN pnpm --filter @nozco/backend deploy --prod --legacy /deploy \
 && mkdir -p /out \
 && cp -r apps/backend/.medusa/server/. /out/ \
 && cp -r /deploy/node_modules /out/node_modules

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    MEDUSA_DISABLE_TELEMETRY=true \
    PORT=9000
# npm, npx and corepack ship with the base image but are never used at run time. Removing them also
# removes their bundled dependencies, and those dependencies' vulnerabilities.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
 && install -d -o node -g node /app
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node_modules/.bin/medusa", "start"]
