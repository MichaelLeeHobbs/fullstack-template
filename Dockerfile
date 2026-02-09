# ===========================================
# Multi-stage Dockerfile for API
# ===========================================

# --- Base ---
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

# --- Build ---
FROM deps AS build
COPY . .
RUN pnpm build

# --- Production ---
FROM base AS production
ENV NODE_ENV=production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]
