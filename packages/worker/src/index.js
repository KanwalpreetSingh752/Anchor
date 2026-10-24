/**
 * Anchor Worker
 *
 * Consumes jobs from BullMQ queues:
 *   - MONITOR_CHECKS  → performs HTTP checks, updates Monitor doc, manages Incidents, enqueues alerts
 *   - ALERT_DISPATCH  → dispatches alert notifications via configured channels
 *   - DATA_AGGREGATION → triggers hourly bucket finalization
 */

import https from 'https';
import http from 'http';
import tls from 'tls';
import { URL } from 'url';
import { Worker } from 'bullmq';

import {
  config,
  connectDB,
  createLogger,
  createRedisConnection,
  Monitor,
  CheckBucket,
  Incident,
  AlertChannel,
  AlertLog,
  QUEUE_NAMES,
  JOB_NAMES,
  alertDispatchQueue,
} from '@anchor/shared';

const logger = createLogger('worker');

const redisPublisher = createRedisConnection();

/**
 * Publishes an event to Redis pub/sub for a specific project.
 * @param {string} projectId
 * @param {string} event
 * @param {object} data
 */
async function publishProjectEvent(projectId, event, data) {
  try {
    const payload = JSON.stringify({ event, type: event, data, ts: Date.now() });
    await redisPublisher.publish(`events:project:${projectId}`, payload);
  } catch (err) {
    logger.error({ err, projectId, event }, 'Failed to publish project event');
  }
}

// ─── HTTP Check Utility ───────────────────────────────────────────────────────

/**
 * Floors a Date to its hour boundary.
 * @param {Date} date
 * @returns {Date}
 */
function floorToHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

/**
 * Performs a raw TCP-level TLS handshake to inspect the SSL certificate
 * expiry for a given hostname.
 * @param {string} hostname
 * @param {number} port
 * @returns {Promise<Date|null>} Certificate expiry date or null on failure
 */
function getSSLExpiry(hostname, port = 443) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: hostname, port, servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      if (cert && cert.valid_to) {
        resolve(new Date(cert.valid_to));
      } else {
        resolve(null);
      }
    });
    socket.on('error', () => resolve(null));
    socket.setTimeout(5000, () => { socket.destroy(); resolve(null); });
  });
}

/**
 * Executes an HTTP/HTTPS request and returns timing + response data.
 * @param {object} params
 * @returns {Promise<{ statusCode: number, latency: number, body: string, error?: string }>}
 */
function performHttpCheck({ url, method, headers, body, timeout }) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const start = Date.now();

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method || 'GET',
      headers: headers || {},
      timeout: timeout || 10000,
    };

    const req = lib.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          latency: Date.now() - start,
          body: responseBody,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 0, latency: timeout, body: '', error: 'Request timed out' });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 0, latency: Date.now() - start, body: '', error: err.message });
    });

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      req.write(body);
    }

    req.end();
  });
}

// ─── Monitor Check Processor ──────────────────────────────────────────────────

async function processMonitorCheck(job) {
  const {
    monitorId,
    projectId,
    url,
    method,
    headers,
    body,
    timeout,
    expectedStatus,
    expectedBodyContains,
    checkSSL,
    sslExpiryThreshold,
  } = job.data;

  logger.debug({ monitorId, url }, 'Running monitor check');

  const now = new Date();
  let status = 'UNKNOWN';
  let latency = null;
  let statusCode = null;
  let errorMsg = null;

  // ── HTTP Check ────────────────────────────────────────────────────────────
  const result = await performHttpCheck({ url, method, headers, body, timeout });
  latency = result.latency;
  statusCode = result.statusCode;
  errorMsg = result.error || null;

  if (!result.error) {
    const statusOk = statusCode === expectedStatus;
    const bodyOk = expectedBodyContains
      ? result.body.includes(expectedBodyContains)
      : true;

    if (statusOk && bodyOk) {
      status = 'UP';
    } else if (statusCode >= 200 && statusCode < 400) {
      status = 'DEGRADED';
      errorMsg = !statusOk
        ? `Expected status ${expectedStatus}, got ${statusCode}`
        : `Body does not contain "${expectedBodyContains}"`;
    } else {
      status = 'DOWN';
      errorMsg = `HTTP ${statusCode}`;
    }
  } else {
    status = 'DOWN';
  }

  // ── SSL Check ─────────────────────────────────────────────────────────────
  const parsed = new URL(url);
  if (checkSSL && parsed.protocol === 'https:') {
    const expiry = await getSSLExpiry(parsed.hostname, Number(parsed.port) || 443);
    if (expiry) {
      const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 0) {
        status = 'DOWN';
        errorMsg = 'SSL certificate has expired';
      } else if (daysUntilExpiry <= sslExpiryThreshold) {
        // Dispatch SSL_EXPIRY alert (non-blocking)
        const monitor = await Monitor.findById(monitorId).populate('alertChannels');
        if (monitor) {
          await dispatchSSLAlert(monitor, expiry, daysUntilExpiry, projectId);
        }
      }
    }
  }

  // ── Update Monitor Document ───────────────────────────────────────────────
  const previousMonitor = await Monitor.findById(monitorId);
  const previousStatus = previousMonitor?.lastStatus ?? 'UNKNOWN';

  await Monitor.findByIdAndUpdate(monitorId, {
    lastCheckedAt: now,
    lastStatus: status,
    lastLatency: latency,
    lastError: errorMsg,
  });

  // ── Write to CheckBucket ──────────────────────────────────────────────────
  const hour = floorToHour(now);
  const sample = { ts: now, status, latency, statusCode, error: errorMsg };

  await CheckBucket.findOneAndUpdate(
    { monitorId, hour },
    {
      $inc: {
        count: 1,
        failures: status === 'DOWN' || status === 'DEGRADED' ? 1 : 0,
        totalLatency: latency || 0,
        [`statuses.${status.toLowerCase()}`]: 1,
      },
      $push: {
        latencySamples: { $each: [latency], $slice: -60 },
        samples: { $each: [sample], $slice: -60 },
      },
    },
    { upsert: true, new: true },
  );

  // ── Incident Management ───────────────────────────────────────────────────
  await manageIncident({ monitorId, projectId, status, previousStatus, errorMsg, now });

  // ── Publish Monitor Check Update ──────────────────────────────────────────
  await publishProjectEvent(projectId, 'monitor:update', {
    monitorId: monitorId.toString(),
    status,
    latency,
    statusCode,
    error: errorMsg,
    lastCheckedAt: now,
  });

  logger.debug({ monitorId, status, latency }, 'Monitor check complete');
}

// ─── Incident Management ─────────────────────────────────────────────────────

async function manageIncident({ monitorId, projectId, status, previousStatus, errorMsg, now }) {
  const isDown = status === 'DOWN' || status === 'DEGRADED';
  const wasDown = previousStatus === 'DOWN' || previousStatus === 'DEGRADED';

  // Transition to DOWN/DEGRADED — open new incident if none open
  if (isDown && !wasDown) {
    const incident = await Incident.create({
      monitorId,
      projectId,
      status: 'OPEN',
      cause: status === 'DOWN' ? 'DOWN' : 'DEGRADED',
      startedAt: now,
      rootCause: errorMsg,
      affectedChecks: 1,
      timeline: [{ ts: now, event: 'OPENED', note: errorMsg }],
    });

    logger.info({ monitorId, incidentId: incident._id }, 'Incident opened');

    await publishProjectEvent(projectId, 'incident:new', incident.toJSON());

    // Enqueue alert dispatch
    const monitor = await Monitor.findById(monitorId);
    if (monitor && monitor.alertChannels.length > 0) {
      await alertDispatchQueue.add(JOB_NAMES.ALERT_SEND, {
        monitorId: monitorId.toString(),
        incidentId: incident._id.toString(),
        type: status === 'DOWN' ? 'DOWN' : 'DEGRADED',
        channelIds: monitor.alertChannels.map((id) => id.toString()),
      });
    }
    return;
  }

  // Increment affected checks counter on open incident
  if (isDown && wasDown) {
    await Incident.findOneAndUpdate(
      { monitorId, status: 'OPEN' },
      {
        $inc: { affectedChecks: 1 },
        $push: { timeline: { ts: now, event: 'UPDATED', note: errorMsg } },
      },
    );
    return;
  }

  // Transition back to UP — resolve open incident
  if (!isDown && wasDown) {
    const incident = await Incident.findOneAndUpdate(
      { monitorId, status: 'OPEN' },
      {
        status: 'RESOLVED',
        resolvedAt: now,
        $push: { timeline: { ts: now, event: 'RESOLVED' } },
      },
      { new: true },
    );

    if (incident) {
      incident.duration = now.getTime() - incident.startedAt.getTime();
      await incident.save();
      logger.info({ monitorId, incidentId: incident._id }, 'Incident resolved');

      await publishProjectEvent(projectId, 'incident:resolved', incident.toJSON());

      // Enqueue recovery alert
      const monitor = await Monitor.findById(monitorId);
      if (monitor && monitor.alertChannels.length > 0) {
        await alertDispatchQueue.add(JOB_NAMES.ALERT_SEND, {
          monitorId: monitorId.toString(),
          incidentId: incident._id.toString(),
          type: 'RECOVERED',
          channelIds: monitor.alertChannels.map((id) => id.toString()),
        });
      }
    }
  }
}

// ─── SSL Alert Helper ─────────────────────────────────────────────────────────

async function dispatchSSLAlert(monitor, expiry, daysRemaining, projectId) {
  const incident = await Incident.create({
    monitorId: monitor._id,
    projectId,
    status: 'OPEN',
    cause: 'SSL_EXPIRY',
    startedAt: new Date(),
    rootCause: `SSL certificate expires in ${Math.floor(daysRemaining)} days (${expiry.toISOString()})`,
    timeline: [{ ts: new Date(), event: 'OPENED', note: `SSL expires ${expiry.toISOString()}` }],
  });

  await publishProjectEvent(projectId, 'incident:new', incident.toJSON());

  if (monitor.alertChannels.length > 0) {
    await alertDispatchQueue.add(JOB_NAMES.ALERT_SEND, {
      monitorId: monitor._id.toString(),
      incidentId: incident._id.toString(),
      type: 'SSL_EXPIRY',
      channelIds: monitor.alertChannels.map((c) => (c._id || c).toString()),
    });
  }
}

// ─── Alert Dispatch Processor ─────────────────────────────────────────────────

async function processAlertDispatch(job) {
  const { monitorId, incidentId, type, channelIds } = job.data;
  logger.info({ monitorId, incidentId, type }, 'Dispatching alert');

  for (const channelId of channelIds) {
    const channel = await AlertChannel.findById(channelId);
    if (!channel || !channel.isActive) continue;

    let alertStatus = 'SENT';
    let alertError = null;

    try {
      await sendAlertToChannel(channel, { monitorId, incidentId, type });
    } catch (err) {
      alertStatus = 'FAILED';
      alertError = err.message;
      logger.error({ err, channelId, type }, 'Alert dispatch failed');
    }

    await AlertLog.create({
      monitorId,
      incidentId,
      channelId,
      type,
      status: alertStatus,
      error: alertError,
    });
  }
}

/**
 * Routes an alert to the correct delivery mechanism based on channel type.
 * @param {object} channel - AlertChannel document
 * @param {{ monitorId, incidentId, type }} alert
 */
async function sendAlertToChannel(channel, alert) {
  switch (channel.type) {
    case 'WEBHOOK':
    case 'SLACK':
      await sendWebhookAlert(channel, alert);
      break;
    case 'EMAIL':
      // Email delivery would use nodemailer; stubbed here to avoid requiring SMTP in dev
      logger.info({ channelId: channel._id, email: channel.config.address }, 'Email alert (stub)');
      break;
    default:
      throw new Error(`Unknown channel type: ${channel.type}`);
  }
}

/**
 * Sends a JSON payload to a webhook / Slack URL.
 */
async function sendWebhookAlert(channel, alert) {
  const webhookUrl = channel.config.webhookUrl || channel.config.url;
  if (!webhookUrl) throw new Error('Webhook URL not configured');

  const payload = JSON.stringify({
    type: alert.type,
    monitorId: alert.monitorId,
    incidentId: alert.incidentId,
    timestamp: new Date().toISOString(),
  });

  const parsed = new URL(webhookUrl);
  const lib = parsed.protocol === 'https:' ? https : http;

  await new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Webhook responded with ${res.statusCode}`));
        res.resume();
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Aggregation Processor ────────────────────────────────────────────────────

async function processDataAggregation(job) {
  const hour = new Date(job.data.hour);
  logger.info({ hour }, 'Running hourly data aggregation (finalization)');
  // In production this would finalize bucket statistics, compute percentiles,
  // and archive or roll-up data. The bucket structure is already updated in
  // real-time by the monitor check processor.
  const count = await CheckBucket.countDocuments({ hour });
  logger.info({ hour, buckets: count }, 'Aggregation complete');
}

// ─── Worker Bootstrap ─────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    await connectDB();

    const connection = createRedisConnection();

    const monitorWorker = new Worker(
      QUEUE_NAMES.MONITOR_CHECKS,
      processMonitorCheck,
      {
        connection,
        concurrency: config.WORKER_CONCURRENCY,
      },
    );

    const alertWorker = new Worker(
      QUEUE_NAMES.ALERT_DISPATCH,
      processAlertDispatch,
      { connection: createRedisConnection(), concurrency: 10 },
    );

    const aggregationWorker = new Worker(
      QUEUE_NAMES.DATA_AGGREGATION,
      processDataAggregation,
      { connection: createRedisConnection(), concurrency: 1 },
    );

    for (const worker of [monitorWorker, alertWorker, aggregationWorker]) {
      worker.on('completed', (job) => logger.debug({ jobId: job.id }, 'Job completed'));
      worker.on('failed', (job, err) =>
        logger.error({ jobId: job?.id, err }, 'Job failed'),
      );
    }

    logger.info({ concurrency: config.WORKER_CONCURRENCY }, 'Anchor Worker running');
  } catch (err) {
    logger.fatal({ err }, 'Worker failed to start');
    process.exit(1);
  }
}

bootstrap();
