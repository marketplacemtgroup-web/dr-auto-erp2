FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json

RUN npm ci

FROM node:22-alpine AS build
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm run build -w @autocore/database && npm run build -w @autocore/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/main.js"]

