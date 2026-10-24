# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm install
COPY packages/frontend ./packages/frontend
RUN npm --prefix packages/frontend run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm ci --workspace=packages/frontend
COPY packages/frontend/server.js ./packages/frontend/server.js
COPY --from=build /app/packages/frontend/dist ./packages/frontend/dist
EXPOSE 5173
CMD ["node", "packages/frontend/server.js"]
