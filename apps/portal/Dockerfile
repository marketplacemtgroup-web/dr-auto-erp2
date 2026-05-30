FROM node:22-alpine AS deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/portal/package.json apps/portal/package.json

RUN npm ci

FROM node:22-alpine AS build
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/portal ./apps/portal

RUN npm run build -w @autocore/portal

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

COPY --from=build /repo/apps/portal/dist ./
COPY apps/portal/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
