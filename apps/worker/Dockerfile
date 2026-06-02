FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json    ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/db ./packages/db
COPY apps/api    ./apps/api

# Generate Prisma client and compile both packages
RUN pnpm --filter @bcf/db generate
RUN pnpm --filter @bcf/db build
RUN pnpm --filter @bcf/api build

CMD ["node", "apps/api/dist/jobs/worker.js"]
