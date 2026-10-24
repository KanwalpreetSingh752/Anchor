<div align="center">

<br/>

<img src="https://img.shields.io/badge/status-production--ready-brightgreen?style=flat-square" />
<img src="https://img.shields.io/badge/node-%3E%3D20-339933?style=flat-square&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
<img src="https://img.shields.io/badge/mongodb-7-47A248?style=flat-square&logo=mongodb&logoColor=white" />
<img src="https://img.shields.io/badge/redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
<img src="https://img.shields.io/badge/license-MIT-E5F455?style=flat-square" />

<br/><br/>

# ⚓ Anchor

### Distributed API Reliability Monitoring — Self-Hosted

**Uptime checks · Latency percentiles · SSL expiry · Incident lifecycle · Real-time alerts · Public status pages**

<br/>

[Live Demo](#quickstart) · [Architecture](#architecture) · [API Reference](#api-reference) · [Configuration](#configuration) · [Deployment](#deployment)

<br/>

</div>

---

## What is Anchor?

Anchor is a production-grade, self-hosted API monitoring platform built for engineering teams who need full observability over their service health without routing sensitive data through third-party SaaS providers.

It continuously dispatches synthetic HTTP probes from a horizontally scalable worker fleet, aggregates time-series telemetry using MongoDB's bucket pattern, maintains a stateful incident lifecycle engine with alert deduplication, and publishes real-time updates to dashboards and configured notification channels — all coordinated through Redis pub/sub and BullMQ.

```
APIs break. Know first.
```

---

## Features

| Capability | Description |
|---|---|
| **Synthetic Probes** | Configurable HTTP/HTTPS checks per endpoint with custom method, interval, timeout, expected status codes, and response body assertions |
| **Latency Telemetry** | Rolling p50, p95, p99 percentile tracking per monitor with hourly bucket aggregation |
| **SSL Certificate Monitoring** | Native TLS inspection of peer certificate chains with configurable expiry-day alert thresholds |
| **Incident Engine** | Stateful `OPEN → ACKNOWLEDGED → RESOLVED` lifecycle with duration tracking, root cause capture, and resolution audit notes |
| **Alert Deduplication** | Redis-backed state machine prevents alert storms during sustained outages — one notification per transition, not per check |
| **Multi-channel Notifications** | Webhook delivery (Slack, Discord, generic HTTP) and email dispatch with live test-ping capability |
| **Public Status Pages** | Cache-aside Redis pattern for low-latency public `/status/:slug` endpoints — no DB hit on visitor traffic |
| **Real-time Dashboard** | WebSocket push updates to the React dashboard on every probe result, zero polling |
| **Horizontal Scale** | Worker processes are stateless and replicated — add more workers without code changes |
| **Project Isolation** | Multi-project workspace separation with role-based access control |

---

## Architecture

Anchor is structured as an **independent multi-process system** orchestrated via Docker Compose. Each process has a single responsibility and communicates through well-defined interfaces.

```
┌─────────────────────────────────────────────────────────────────┐
│                  REACT FRONTEND (Vite 5 + Tailwind CSS)         │
│        Plus Jakarta Sans · Recharts · Socket.IO · Lucide        │
└───────────────────────┬──────────────────────┬──────────────────┘
                        │  REST (HTTP/JSON)     │  WebSocket
┌───────────────────────▼──────────────────────▼──────────────────┐
│                  EXPRESS 5 API SERVER  :3001                     │
│   JWT Auth · Projects · Monitors · Incidents · Alert Channels    │
│         Checks / SLO Analytics · Status Pages · Socket.IO        │
└──────────┬────────────────────────────────────┬─────────────────┘
           │ Mongoose ODM                        │ Redis Pub/Sub
┌──────────▼──────────┐             ┌────────────▼────────────────┐
│     MongoDB 7       │             │          Redis 7             │
│  CheckBucket docs   │             │  BullMQ Job Queues          │
│  Incident records   │             │  Alert Dedup State          │
│  Monitor configs    │             │  Status Page Cache (60s TTL)│
│  Project / User     │             │  Socket.IO multi-proc bridge│
└─────────────────────┘             └──────┬──────────────┬───────┘
                                           │ Pull jobs     │ Pull jobs
                             ┌─────────────▼────┐  ┌──────▼──────────────┐
                             │   SCHEDULER       │  │  WORKER  (N replicas)│
                             │   Reconciles      │  │  HTTP probe + TLS   │
                             │   BullMQ timers   │  │  Bucket aggregation │
                             │   scheduler:sync  │  │  Incident FSM       │
                             │   pub/sub         │  │  Alert dispatch     │
                             └───────────────────┘  └─────────────────────┘
```

### Process Responsibilities

**`packages/api`** — Express 5 REST API and Socket.IO event gateway. Handles authentication, all CRUD operations, stats aggregation, and relays worker result events to connected browser clients via Redis → Socket.IO bridge.

**`packages/scheduler`** — Single-instance process. Reads all active monitors from MongoDB, registers repeatable BullMQ jobs keyed by monitor ID and interval, and listens on `scheduler:sync` Redis pub/sub to hot-reload when monitors are added, updated, or removed — with no restart required.

**`packages/worker`** — Horizontally scalable, stateless job consumers. Each worker instance pulls probe jobs from BullMQ, executes the HTTP check with TLS inspection, atomically updates `CheckBucket` documents via `$inc` and `$push/$slice`, evaluates incident state transitions, deduplicates alerts via Redis, dispatches webhook and email notifications, and publishes the result to the API via Redis pub/sub.

**`packages/frontend`** — React 18 SPA served by a lightweight Express static server. Connects over WebSocket for live probe results and uses the REST API for all data operations.

**`shared/`** — Shared ESM package containing Mongoose models, configuration loader, Redis client factory, logger, and utility functions consumed across all server-side processes.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM modules throughout) |
| API Framework | Express 5 |
| ODM | Mongoose 8 |
| Database | MongoDB 7 |
| Job Queue | BullMQ 5 |
| Cache / Pub-Sub | Redis 7 (IORedis) |
| Real-time | Socket.IO 4 (multi-process Redis adapter) |
| Validation | Zod schema validation |
| Logging | Pino + pino-pretty |
| Auth | JWT (15m access) + Refresh Token rotation (7d HTTP-only cookie) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 + `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Typography | Plus Jakarta Sans · JetBrains Mono |
| HTTP | Axios |
| WebSocket | Socket.IO Client |

### Infrastructure
| Component | Technology |
|---|---|
| Orchestration | Docker Compose |
| Worker Scaling | Horizontal replicas (stateless) |
| Health Checks | Docker `healthcheck` on MongoDB and Redis |
| Networking | Internal Docker bridge network |

---

## Quickstart

### Prerequisites

- **Docker** and **Docker Compose** v2+
- **Node.js 20+** (for local development only)

### 1. Clone and configure

```bash
git clone https://github.com/your-org/anchor.git
cd anchor

cp .env.example .env
```

Edit `.env` and set at minimum:

```env
JWT_SECRET=your-secret-minimum-32-chars
JWT_REFRESH_SECRET=your-other-secret-minimum-32-chars
MONGODB_URI=mongodb://mongo:27017/anchor
REDIS_URL=redis://redis:6379
FRONTEND_URL=http://localhost:5173
```

### 2. Launch all services

```bash
docker compose up --build
```

This starts 7 containers: MongoDB, Redis, API server, Scheduler, 2× Worker replicas, and the Frontend.

| Service | URL |
|---|---|
| **Dashboard** | http://localhost:5173 |
| **API** | http://localhost:3001 |
| **API Health Check** | http://localhost:3001/api/health |

### 3. Create your account

Open the dashboard, click **Sign in → Create Account**, register, and start adding monitors.

---

## Local Development

```bash
# Install all workspace dependencies
npm install

# Start infrastructure only
docker compose up -d mongo redis

# Run each process in a separate terminal
npm run dev:api         # Express API + Socket.IO  :3001
npm run dev:scheduler   # BullMQ scheduler
npm run dev:worker      # Probe worker (add WORKER_ID env for multiple)
npm run dev:frontend    # Vite dev server  :5173
```

Hot-reload is enabled for the frontend (Vite HMR) and all backend processes (via `--watch` or nodemon).

---

## Configuration

All configuration is driven by environment variables. See `.env.example` for the full reference.

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | ✅ | — | MongoDB connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `JWT_SECRET` | ✅ | — | Access token signing secret (≥32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token signing secret (≥32 chars) |
| `JWT_EXPIRES_IN` | | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Refresh token TTL |
| `FRONTEND_URL` | ✅ | — | Allowed CORS origin |
| `PORT` | | `3001` | API server port |
| `NODE_ENV` | | `development` | `development` or `production` |
| `WORKER_CONCURRENCY` | | `10` | Concurrent jobs per worker process |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication

```
POST   /api/auth/register          Create account
POST   /api/auth/login             Sign in — returns access token, sets refresh cookie
POST   /api/auth/refresh           Rotate refresh token
POST   /api/auth/logout            Revoke session
GET    /api/auth/me                Current user profile
```

### Projects

```
GET    /api/projects               List projects
POST   /api/projects               Create project
PATCH  /api/projects/:id           Update project name
DELETE /api/projects/:id           Delete project and all associated data
```

### Monitors

```
GET    /api/projects/:projectId/monitors                     List monitors
POST   /api/projects/:projectId/monitors                     Create monitor
GET    /api/projects/:projectId/monitors/:id                 Get monitor
PATCH  /api/projects/:projectId/monitors/:id                 Update monitor
PATCH  /api/projects/:projectId/monitors/:id/toggle          Pause / resume
DELETE /api/projects/:projectId/monitors/:id                 Delete monitor
```

**Monitor payload:**
```json
{
  "name": "Payments API",
  "url": "https://api.acme.com/v1/payments",
  "method": "GET",
  "interval": 60,
  "timeout": 10000,
  "expectedStatus": 200,
  "expectedBodyContains": "ok",
  "checkSSL": true,
  "sslExpiryThreshold": 14
}
```

### Checks & Analytics

```
GET    /api/projects/:projectId/monitors/:id/stats
       ?range=24h|7d|30d

       Returns: uptime %, totalChecks, avgLatency, p50, p95, p99,
                totalFailures, hourly series

GET    /api/projects/:projectId/monitors/:id/checks
       ?range=24h|7d|30d&limit=50&page=1

       Returns: paginated raw check samples (ts, status, latency,
                statusCode, error)
```

### Incidents

```
GET    /api/projects/:projectId/incidents
       ?status=OPEN|ACKNOWLEDGED|RESOLVED&monitorId=...

PATCH  /api/projects/:projectId/incidents/:id/acknowledge
PATCH  /api/projects/:projectId/incidents/:id/resolve
       Body: { "note": "Root cause identified and patched." }
```

### Alert Channels

```
GET    /api/projects/:projectId/alert-channels
POST   /api/projects/:projectId/alert-channels
DELETE /api/projects/:projectId/alert-channels/:id
POST   /api/projects/:projectId/alert-channels/:id/test
```

**Webhook channel payload:**
```json
{
  "name": "Slack #oncall",
  "type": "WEBHOOK",
  "config": { "webhookUrl": "https://hooks.slack.com/services/..." }
}
```

**Email channel payload:**
```json
{
  "name": "SRE Distribution List",
  "type": "EMAIL",
  "config": { "email": "sre@acme.com" }
}
```

### Status Pages

```
GET    /api/projects/:projectId/status-page
POST   /api/projects/:projectId/status-page
PATCH  /api/projects/:projectId/status-page

GET    /api/status/:slug           Public endpoint (Redis-cached, 60s TTL)
```

**Public UI route:** `/status/:slug`

---

## Deployment

### Scaling Workers

To run additional worker replicas, add entries to `docker-compose.yml`:

```yaml
anchor-worker-3:
  build:
    context: .
    dockerfile: packages/worker/Dockerfile
  environment:
    - WORKER_ID=3
  depends_on:
    mongo:
      condition: service_healthy
    redis:
      condition: service_healthy
```

Workers are fully stateless — scale to any count without coordination.

### Production Checklist

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (≥64 chars, random)
- [ ] Configure `NODE_ENV=production`
- [ ] Point `MONGODB_URI` to a replica set with authentication enabled
- [ ] Use a managed Redis instance or Redis Sentinel for HA
- [ ] Put the frontend behind a reverse proxy (nginx / Caddy) with TLS termination
- [ ] Set `FRONTEND_URL` to your production domain for CORS
- [ ] Restrict MongoDB and Redis ports from public network access
- [ ] Enable MongoDB authentication and create a least-privilege application user
- [ ] Configure log aggregation (Pino outputs structured JSON — compatible with Datadog, Loki, CloudWatch)

---

## Project Structure

```
anchor/
├── docker-compose.yml
├── docker-compose.dev.yml
├── package.json                  # npm workspaces root
├── .env.example
│
├── packages/
│   ├── api/                      # Express 5 REST API + Socket.IO
│   │   └── src/
│   │       ├── modules/          # Feature modules (auth, monitors, incidents…)
│   │       ├── middleware/       # Auth, validation, project-access
│   │       └── sockets/          # Redis → Socket.IO bridge
│   │
│   ├── scheduler/                # BullMQ job registration + sync
│   ├── worker/                   # Probe execution + incident engine
│   │
│   └── frontend/                 # React 18 + Vite 5 SPA
│       └── src/
│           ├── components/       # Modals, views, landing hero
│           ├── pages/            # Dashboard, AuthPage, PublicStatusPage
│           ├── context/          # AuthContext
│           ├── hooks/            # useProjectSocket
│           └── lib/              # Axios API client
│
└── shared/                       # @anchor/shared — models, config, logger
    └── src/
        ├── models/               # Mongoose schemas (Monitor, CheckBucket,
        │                         #   Incident, AlertChannel, StatusPage…)
        ├── config.js
        ├── db.js
        ├── redis.js
        └── logger.js
```

---

## Engineering Notes

### MongoDB Bucket Pattern

Check results are **not stored as individual documents**. Instead, each monitor accumulates into hourly `CheckBucket` documents using atomic `$inc` and `$push` operations. This eliminates write amplification at high check frequencies and makes range-query aggregations (uptime %, percentiles) cheap — scanning bucket-level summaries rather than millions of raw samples.

### Refresh Token Rotation & Replay Detection

Every token refresh issues a **new refresh token** and invalidates the previous one. If an already-consumed token is presented (indicating a possible token theft), **all sessions for that user are immediately revoked**. This provides forward secrecy without requiring a server-side session store per request.

### Zero-Downtime Scheduler Sync

When a monitor is created, updated, or deleted, the API publishes a `scheduler:sync` event to Redis pub/sub. The scheduler process receives this event and reconciles its BullMQ job registry in-memory — no restart, no polling lag, no missed intervals.

---

## License

MIT © Anchor Contributors

---

<div align="center">
  <strong>Built with care for engineering teams who care about reliability.</strong>
</div>
