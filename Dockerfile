# syntax=docker/dockerfile:1

# ── Stage 1: build the React/Vite frontend ──────────────────────────────────
FROM node:20-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# VITE_API_URL is baked in at build time; defaults to same-origin "/api".
ARG VITE_API_URL
RUN npm run build

# ── Stage 2: install backend production deps (compiles better-sqlite3) ───────
FROM node:20-bookworm-slim AS backend
WORKDIR /app/backend
# Build toolchain in case better-sqlite3 has no prebuilt binary for the arch.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# ── Stage 3: lean runtime image ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/crm.db
WORKDIR /app

# App code + built assets
COPY --from=backend  /app/backend        ./backend
COPY --from=frontend /app/frontend/dist  ./frontend/dist

# Persistent SQLite volume (owned by the unprivileged node user)
RUN mkdir -p /data && chown -R node:node /data /app
VOLUME /data
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/server.js"]
