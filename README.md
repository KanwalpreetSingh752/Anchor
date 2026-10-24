# Anchor ⚓ — Distributed API Reliability Monitoring Platform

Anchor is an API reliability monitoring engine built on the MERN stack with Redis, BullMQ, and WebSockets. Designed with production distributed systems patterns, Anchor executes concurrent probes, monitors SSL certificates, aggregates time-series telemetry using MongoDB's **Bucket Pattern**, and orchestrates stateful alert deduplication and public status pages.

---

## 🏛 System Architecture

Anchor is architected as an **independent multi-process system** orchestrated via Docker Compose:

```
┌─────────────────────────────────────────────────────────────┐
│                 REACT CLIENT (Vite + Tailwind)              │
│       Recharts · shadcn/ui · Socket.IO · TanStack Query     │
└────────────────────┬──────────────────────┬─────────────────┘
                     │ REST (HTTP/JSON)     │ WebSocket
┌────────────────────▼──────────────────────▼─────────────────┐
│               EXPRESS API SERVER (Port 3001)                 │
│  Auth (JWT+RT Rotation) · Monitors · Incidents · Alerts      │
│          Checks/SLO Analytics · Status Pages Cache           │
│                 Socket.IO Server Bridge                      │
└───────┬──────────────────────────────────────┬──────────────┘
        │ Mongoose                              │ Redis Pub/Sub
┌───────▼────────┐              ┌───────────────▼──────────────┐
│   MongoDB 7    │              │          Redis 7             │
│  (Persistent)  │              │  BullMQ Queues · Pub/Sub     │
│                │              │  Alert State · Status Cache  │
└────────────────┘              └───────┬──────────────┬───────┘
                                        │ Pull jobs     │ Pull jobs
                          ┌─────────────▼──┐   ┌───────▼────────┐
                          │   SCHEDULER    │   │ WORKER PROCESS  │
                          │   PROCESS      │   │  (2+ Replicas)  │
                          │  Registers &   │   │ HTTP + SSL      │
                          │  synchronizes  │   │ CheckBuckets    │
                          │  monitors via  │   │ Incident Engine │
                          │  BullMQ jobs   │   │ Redis Pub/Sub   │
                          └────────────────┘   └────────────────┘
```

---

## 🚀 Key Engineering & Distributed Systems Highlights

1. **Independent Process Isolation**:
   - `packages/api`: Express 5 REST API + Socket.IO real-time event router.
   - `packages/scheduler`: Pulls active monitors from MongoDB, reconciles in-memory timers, listens to `scheduler:sync` pub/sub events, and produces repeatable jobs in BullMQ.
   - `packages/worker`: Horizontally scalable job consumer. Performs network I/O probes, validates TLS expiry & chains, atomically aggregates check buckets in MongoDB, evaluates alert state transitions, and dispatches notifications.

2. **Time-Series Bucket Pattern (MongoDB)**:
   - Avoids high-frequency write amplification by bucketing checks into hourly documents (`CheckBucket`).
   - Atomic `$inc` updates for `count`, `failures`, and `totalLatency`, with a rolling `$push` (capped with `$slice: -60`) for raw debug samples.
   - Enables fast, lightweight read aggregations for uptime %, P50, P95, and P99 latency calculations without full collection scans.

3. **Stateful Alert Deduplication & Lifecycle Engine**:
   - Maintains state machine transitions (`UP` ⇄ `DOWN` ⇄ `DEGRADED`).
   - Automatically opens `Incident` documents on failure and resolves them on recovery with duration metrics and an audit timeline.
   - Deduplicates notifications via Redis state caching to prevent alert storms during sustained outages.

4. **SSL / TLS Certificate Monitoring**:
   - Utilizes Node.js's native `tls.connect` to inspect peer certificates, check remaining validity days against configurable thresholds, and trigger alerts before certificates expire.

5. **Security & Authentication**:
   - Short-lived Access Tokens (15m JWT) combined with Long-lived Refresh Tokens (7d) stored in secure HTTP-only cookies.
   - Cryptographic Refresh Token rotation with automatic reuse detection (revokes all active sessions upon replay attack detection).

6. **Public Status Pages**:
   - Cache-aside pattern via Redis (60-second TTL) for public status endpoints (`/api/status/:slug` and `/status/:slug`), offloading high-traffic visitor read volume from the database.

---

## 🛠 Tech Stack

- **Backend**: Node.js (ESM), Express 5, Mongoose 8, MongoDB 7
- **Job Orchestration**: BullMQ 5, IORedis, Redis 7 Alpine
- **Real-time**: Socket.IO with multi-process Redis Pub/Sub adapter
- **Logging & Validation**: Pino, pino-pretty, Zod runtime validation
- **Frontend**: React 18, Vite 5, Tailwind CSS, Recharts, Lucide Icons
- **Deployment**: Docker Compose with health checks and multi-container networking

---

## 🏁 Quickstart Guide

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Running with Docker Compose (Recommended)
```bash
# 1. Clone & copy environment configuration
cp .env.example .env

# 2. Build and launch all services (MongoDB, Redis, API, Scheduler, 2x Workers, Frontend)
docker compose up --build
```
Once initialized:
- **Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Server & Health**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`

### Running Locally (Bare Metal)
```bash
# Install dependencies across all npm workspaces
npm install

# Start MongoDB and Redis containers
docker compose up -d mongo redis

# Run services in separate terminal windows:
npm run dev:api
npm run dev:scheduler
npm run dev:worker
npm run dev:frontend
```

---

## 🔌 API Reference Highlights

### Authentication
- `POST /api/auth/register` — Create developer account
- `POST /api/auth/login` — Sign in (returns JWT access token, sets HTTP-only refresh cookie)
- `POST /api/auth/refresh` — Rotate refresh token & issue new access token
- `POST /api/auth/logout` — Revoke refresh token & invalidate session
- `GET /api/auth/me` — Current authenticated user profile

### Monitors
- `GET /api/projects/:projectId/monitors` — List all registered endpoints
- `POST /api/projects/:projectId/monitors` — Register new monitor
- `GET /api/projects/:projectId/monitors/:id` — Monitor config details
- `PATCH /api/projects/:projectId/monitors/:id` — Update interval/thresholds
- `PATCH /api/projects/:projectId/monitors/:id/toggle` — Pause/resume monitoring
- `DELETE /api/projects/:projectId/monitors/:id` — Remove monitor

### Checks & Analytics
- `GET /api/projects/:projectId/monitors/:id/stats?range=24h` — Overall uptime %, avg latency, P50, P95, P99 percentiles, and hourly series
- `GET /api/projects/:projectId/monitors/:id/checks?range=24h&limit=50` — Raw sample audit log

### Incidents
- `GET /api/projects/:projectId/incidents` — List incidents (filter by `OPEN` or `RESOLVED`)
- `PATCH /api/projects/:projectId/incidents/:id/acknowledge` — Acknowledge incident
- `PATCH /api/projects/:projectId/incidents/:id/resolve` — Mark resolved with note

### Alerts & Notification Channels
- `GET /api/projects/:projectId/alert-channels` — List channels (Webhook, Slack, Email)
- `POST /api/projects/:projectId/alert-channels` — Add channel
- `POST /api/projects/:projectId/alert-channels/:id/test` — Dispatch live test ping

### Public Status Pages
- `GET /api/status/:slug` — Public status overview (Redis-cached)
- `GET/POST/PATCH /api/projects/:projectId/status-page` — Manage project status page configuration
