FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY packages/worker/package*.json ./packages/worker/
COPY shared/package*.json ./shared/
RUN npm ci --workspace=packages/worker --workspace=shared

FROM deps AS development
COPY packages/worker ./packages/worker
COPY shared ./shared
CMD ["npm", "run", "dev", "--workspace=packages/worker"]

FROM deps AS production
COPY packages/worker ./packages/worker
COPY shared ./shared
CMD ["node", "packages/worker/src/index.js"]
