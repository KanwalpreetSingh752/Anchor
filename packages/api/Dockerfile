FROM node:20-alpine AS base
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY shared/package*.json ./shared/
RUN npm ci --workspace=packages/api --workspace=shared

# ── Development target (with nodemon) ────────────────────────────────────────
FROM deps AS development
COPY packages/api ./packages/api
COPY shared ./shared
EXPOSE 3001
CMD ["npm", "run", "dev", "--workspace=packages/api"]

# ── Production target ─────────────────────────────────────────────────────────
FROM deps AS production
COPY packages/api ./packages/api
COPY shared ./shared
EXPOSE 3001
CMD ["node", "packages/api/src/app.js"]
