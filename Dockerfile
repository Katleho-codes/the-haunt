# syntax=docker/dockerfile:1
#
# THE HAUNT: production image for self-hosting (for example on a homelab). Node 24 is the current Active LTS.
#
#   docker build -t the-haunt .
#   docker run --rm -p 3200:3000 the-haunt        ->  http://localhost:3200
#
# The app is local-first: it has no database, no secrets and makes no outbound requests at runtime. Visitors' data stays in
# their own browser. The container only serves static and server-rendered files.
#
# The build needs internet access once: next/font downloads the Google fonts and bundles them into the image, so visitors'
# browsers never contact Google. Pin the base image by digest (node:22-alpine@sha256:...) if you want fully repeatable builds.

ARG NODE_VERSION=24

# ---- 1. dependencies (cached until package files change) ----
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- 2. build ----
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. runtime (small, non-root) ----
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Run as an unprivileged user.
RUN addgroup -S -g 1001 haunt && adduser -S -u 1001 -G haunt haunt

COPY --from=build --chown=haunt:haunt /app/.next/standalone ./
COPY --from=build --chown=haunt:haunt /app/.next/static ./.next/static
COPY --from=build --chown=haunt:haunt /app/public ./public
COPY --chown=haunt:haunt LICENSE ./LICENSE

USER haunt
EXPOSE 3000

# Reports healthy once the home page answers. busybox wget ships with the alpine image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1

CMD ["node", "server.js"]
