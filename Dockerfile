# syntax=docker/dockerfile:1

FROM node:24-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

# Local development image used by docker-compose.yml. Source changes are
# synced into the container by `docker compose up --watch`.
FROM deps AS dev
COPY . .

FROM deps AS build
COPY . .
RUN npm run build

# Production image (used by Render). Must stay the last stage so it's the default target.
# The API serves the built web client so both share one origin and the session cookie.
FROM base AS prod
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w api && npm cache clean --force
COPY apps/api/migrations apps/api/migrations
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
ENV STATIC_DIR=/app/apps/web/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
