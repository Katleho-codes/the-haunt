# syntax=docker/dockerfile:1
# Placeholder API image (see server.mjs). No dependencies to install. Replace with the real API build later.
ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine

WORKDIR /app
ENV NODE_ENV=production PORT=4000

RUN addgroup -S -g 1002 hauntapi && adduser -S -u 1002 -G hauntapi hauntapi
COPY --chown=hauntapi:hauntapi server.mjs ./server.mjs

USER hauntapi
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "server.mjs"]
