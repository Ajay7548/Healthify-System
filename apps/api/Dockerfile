# Multi-stage build for the Express API. Build context is the repo root so the
# workspace package (@hc/shared) is available. Plain JS — there's no compile
# step; the "build" is just installing production dependencies.

# --- deps: install production dependencies only -----------------------------
FROM node:22-slim AS deps
ENV PNPM_HOME=/pnpm PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /repo

# Copy manifests first so dependency installs cache across source-only changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --prod --filter @hc/api...

# --- runtime: lean image that just runs node --------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo

# Workspace layout + source first...
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# ...then every package's node_modules from the deps stage. pnpm keeps each
# package's dependency symlinks in its own node_modules (so @hc/shared finds its
# own zod), all pointing into the root virtual store.
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules

WORKDIR /repo/apps/api
USER node
EXPOSE 4000

# Liveness from inside the container using Node's built-in fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
