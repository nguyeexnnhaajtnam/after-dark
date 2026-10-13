FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile=false && pnpm --filter @after-dark/api prisma:generate && pnpm --filter @after-dark/api build
FROM node:22-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app ./
EXPOSE 4000
CMD ["pnpm","--filter","@after-dark/api","start"]
