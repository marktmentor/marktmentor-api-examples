# The example app as a public demo: demo mode with the public test key
# mm_test_demo only. It shows the examples of the API reference, never live
# data. The server (scripts/serve.mjs) refuses to start when the environment
# holds a live key (mm_live_...) or MARKTMENTOR_API_KEY.
#
#   docker build -t api-demo .
#   docker run --rm -p 8080:8080 --read-only --tmpfs /tmp --tmpfs /data:uid=1000,gid=1000 api-demo
#
# Runs as a non-root user and works with a read-only root filesystem: the
# SQLite cache goes to /data and temporary files to /tmp. Give both a
# writable volume (for example an emptyDir in Kubernetes). Health check:
# GET /healthz on port 8080.
FROM node:22-slim AS build
# Build tools for better-sqlite3, when no prebuilt binary is available.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:22-slim
# MARKTMENTOR_SEARCH_INDEXING: "off" asks search engines not to index the app:
# every response gets X-Robots-Tag: noindex, nofollow and every page the robots
# meta tag (scripts/robots.mjs). Set "on" to allow indexing.
ENV NODE_ENV=production \
  MARKTMENTOR_SEARCH_INDEXING=off \
  MARKTMENTOR_DEMO=1 \
  MARKTMENTOR_DB_PATH=/data/marktmentor.db \
  PORT=8080 \
  HOST=0.0.0.0 \
  TMPDIR=/tmp
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
RUN mkdir -p /data && chown node:node /data
# The user "node" (uid 1000) of the base image.
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "scripts/serve.mjs"]
