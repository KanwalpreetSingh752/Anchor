import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

import { config, connectDB, createLogger } from '@anchor/shared';

import { authRouter } from './modules/auth/auth.routes.js';
import { projectsRouter } from './modules/projects/projects.routes.js';
import { monitorsRouter } from './modules/monitors/monitors.routes.js';
import { incidentsRouter } from './modules/incidents/incidents.routes.js';
import { alertsRouter } from './modules/alerts/alerts.routes.js';
import { checksRouter } from './modules/checks/checks.routes.js';
import { statusPagesRouter } from './modules/status-pages/status-pages.routes.js';
import { initRedisSocketBridge } from './sockets/socket.service.js';

const logger = createLogger('app');

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express();

// Security headers
app.use(helmet());

// CORS — allow the frontend origin, permit credentials (cookies)
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
);

// Parse JSON bodies and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse cookies (needed for HTTP-only refresh token cookie)
app.use(cookieParser());

// Rate limiting on all /api/* routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' },
  },
});
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api', projectsRouter);
app.use('/api', monitorsRouter);
app.use('/api', incidentsRouter);
app.use('/api', alertsRouter);
app.use('/api', checksRouter);
app.use('/api', statusPagesRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error(
    { err, method: req.method, url: req.url },
    'Unhandled error',
  );

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    config.NODE_ENV === 'production' && statusCode === 500
      ? 'An internal server error occurred.'
      : err.message || 'An internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
});

// ─── HTTP + Socket.IO Server ──────────────────────────────────────────────────

const httpServer = http.createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.FRONTEND_URL,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'Socket.IO client connected');

  socket.on('subscribe:project', (projectId) => {
    socket.join(`project:${projectId}`);
    logger.debug({ socketId: socket.id, projectId }, 'Socket subscribed to project');
  });

  socket.on('unsubscribe:project', (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.debug({ socketId: socket.id, reason }, 'Socket.IO client disconnected');
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    await connectDB();
    initRedisSocketBridge(io);

    httpServer.listen(config.PORT, () => {
      logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Anchor API server started');
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

export default app;
