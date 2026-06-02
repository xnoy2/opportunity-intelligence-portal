# Phase 1: uses Cheerio only (no Chromium needed)
# Phase 3+: uncomment the Playwright block when adding JS-rendered scrapers

FROM node:20-slim AS base

# Install OpenSSL — required by Prisma's native query engine
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy workspace manifests + lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Generate Prisma client and compile @bcf/db to JS
RUN pnpm --filter @bcf/db generate
RUN pnpm --filter @bcf/db build

# Build API
RUN pnpm --filter @bcf/api build

# ─── Phase 3+ Playwright support ───────────────────────────────────────────────
# Uncomment this block when you add JS-rendered scrapers (eplanning.ie etc.)
#
# RUN apt-get update && apt-get install -y \
#     chromium \
#     fonts-liberation \
#     libatk-bridge2.0-0 \
#     libatk1.0-0 \
#     libcairo2 \
#     libcups2 \
#     libdbus-1-3 \
#     libdrm2 \
#     libgbm1 \
#     libglib2.0-0 \
#     libgtk-3-0 \
#     libnspr4 \
#     libnss3 \
#     libpango-1.0-0 \
#     libx11-6 \
#     libxcomposite1 \
#     libxdamage1 \
#     libxext6 \
#     libxfixes3 \
#     libxrandr2 \
#     xdg-utils \
#     --no-install-recommends && rm -rf /var/lib/apt/lists/*
# ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin
# ─────────────────────────────────────────────────────────────────────────────

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
