# ============================================================
# Just Eat Clone API — Multi-stage Dockerfile
# ============================================================
# Stages:
#   1. base         — shared Alpine base with dumb-init
#   2. development  — dev server (source bind-mounted)
#   3. deps         — install ALL dependencies for build
#   4. builder      — compile TypeScript, copy non-TS assets, prune to prod deps
#   5. production   — minimal runtime image
# ============================================================

# Stage 1: Base Image
FROM node:20-alpine AS base
RUN apk add --no-cache dumb-init libc6-compat
WORKDIR /app

# Stage 2: Development (source + node_modules via bind mount)
FROM base AS development
ENV NODE_ENV=development
WORKDIR /app
RUN mkdir -p logs
EXPOSE 4005
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]

# Stage 3: Dependencies (for builder/production only)
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Stage 4: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build

# Copy non-TS runtime assets into dist (JSON locale files for i18n)
RUN cp -r src/shared/i18n/locales dist/shared/i18n/locales

# Prune to production-only deps
RUN npm ci --omit=dev && npm cache clean --force

# Stage 5: Production
FROM base AS production
ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

WORKDIR /app

# Copy compiled app + production deps + seed data
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package*.json ./
COPY --chown=expressjs:nodejs data ./data

# Create writable logs directory
RUN mkdir -p logs && chown -R expressjs:nodejs logs

USER expressjs
EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4005/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
