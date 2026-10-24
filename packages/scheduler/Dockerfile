FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY packages/scheduler/package*.json ./packages/scheduler/
COPY shared/package*.json ./shared/
RUN npm ci --workspace=packages/scheduler --workspace=shared

FROM deps AS development
COPY packages/scheduler ./packages/scheduler
COPY shared ./shared
CMD ["npm", "run", "dev", "--workspace=packages/scheduler"]

FROM deps AS production
COPY packages/scheduler ./packages/scheduler
COPY shared ./shared
CMD ["node", "packages/scheduler/src/index.js"]
