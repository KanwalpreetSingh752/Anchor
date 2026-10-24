/**
 * Anchor Scheduler
 *
 * Responsibilities:
 *  - Loads all active monitors from MongoDB on startup and after receiving
 *    a scheduler:sync pub/sub message from the API.
 *  - Enqueues a `monitor:check` job into the MONITOR_CHECKS BullMQ queue
 *    at the correct interval for each active monitor.
 *  - Enqueues hourly aggregation jobs into the DATA_AGGREGATION queue.
 *
 * The scheduler uses an in-memory map of interval timers keyed by monitorId
 * so that it can cleanly start, stop, and restart timers on sync events.
 */

import {
  config,
  connectDB,
  createLogger,
  Monitor,
  createRedisConnection,
  monitorChecksQueue,
  dataAggregationQueue,
  JOB_NAMES,
  QUEUE_NAMES,
} from '@anchor/shared';

const logger = createLogger('scheduler');

/** Map<monitorId, NodeJS.Timeout> — active interval handles */
const activeTimers = new Map();

// ─── Monitor Scheduling ───────────────────────────────────────────────────────

/**
 * Enqueues a single monitor check job.
 * @param {object} monitor - Mongoose document
 */
async function enqueueCheck(monitor) {
  const jobId = `check:${monitor._id}:${Date.now()}`;
  await monitorChecksQueue.add(
    JOB_NAMES.MONITOR_CHECK,
    {
      monitorId: monitor._id.toString(),
      projectId: monitor.projectId.toString(),
      url: monitor.url,
      method: monitor.method,
      headers: monitor.headers ? Object.fromEntries(monitor.headers) : {},
      body: monitor.body,
      timeout: monitor.timeout,
      expectedStatus: monitor.expectedStatus,
      expectedBodyContains: monitor.expectedBodyContains,
      checkSSL: monitor.checkSSL,
      sslExpiryThreshold: monitor.sslExpiryThreshold,
    },
    { jobId },
  );
  logger.debug({ monitorId: monitor._id, url: monitor.url }, 'Enqueued monitor check');
}

/**
 * Clears the interval timer for a monitor.
 * @param {string} monitorId
 */
function clearMonitorTimer(monitorId) {
  const timer = activeTimers.get(monitorId);
  if (timer) {
    clearInterval(timer);
    activeTimers.delete(monitorId);
  }
}

/**
 * Starts an interval timer for a monitor that fires an immediate check
 * then repeats every `monitor.interval` seconds.
 * @param {object} monitor
 */
function scheduleMonitor(monitor) {
  const id = monitor._id.toString();
  clearMonitorTimer(id); // clear any existing timer first

  // Run an immediate check, then on the interval
  enqueueCheck(monitor).catch((err) =>
    logger.error({ err, monitorId: id }, 'Failed to enqueue initial check'),
  );

  const intervalMs = monitor.interval * 1000;
  const timer = setInterval(() => {
    enqueueCheck(monitor).catch((err) =>
      logger.error({ err, monitorId: id }, 'Failed to enqueue periodic check'),
    );
  }, intervalMs);

  activeTimers.set(id, timer);
  logger.info({ monitorId: id, intervalMs }, 'Monitor scheduled');
}

// ─── Sync Logic ───────────────────────────────────────────────────────────────

/**
 * Loads all active monitors from MongoDB and reconciles them with the
 * current in-memory timer map.
 */
async function syncMonitors() {
  logger.info('Syncing monitors...');

  const monitors = await Monitor.find({ isActive: true });
  const activeIds = new Set(monitors.map((m) => m._id.toString()));

  // Stop timers for monitors that are no longer active
  for (const id of activeTimers.keys()) {
    if (!activeIds.has(id)) {
      clearMonitorTimer(id);
      logger.info({ monitorId: id }, 'Removed timer for deactivated monitor');
    }
  }

  // Start / update timers for active monitors
  for (const monitor of monitors) {
    scheduleMonitor(monitor);
  }

  logger.info({ total: monitors.length }, 'Monitor sync complete');
}

// ─── Hourly Aggregation Scheduling ───────────────────────────────────────────

/**
 * Schedules a repeating job to trigger data aggregation at the top of every hour.
 */
function scheduleHourlyAggregation() {
  const msUntilNextHour = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next.getTime() - now.getTime();
  };

  const enqueueAggregation = async () => {
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    await dataAggregationQueue.add(
      JOB_NAMES.HOURLY_AGGREGATE,
      { hour: hour.toISOString() },
      { jobId: `aggregate:${hour.toISOString()}` },
    );
    logger.info({ hour }, 'Enqueued hourly aggregation job');

    // Schedule next occurrence
    setTimeout(enqueueAggregation, msUntilNextHour());
  };

  setTimeout(enqueueAggregation, msUntilNextHour());
  logger.info('Hourly aggregation scheduler armed');
}

// ─── Redis Pub/Sub ────────────────────────────────────────────────────────────

/**
 * Subscribes to the scheduler:sync channel so the API can trigger a re-sync
 * whenever monitors are created, updated, or deleted.
 */
async function listenForSyncEvents() {
  const subscriber = createRedisConnection();

  subscriber.on('message', async (channel, _message) => {
    if (channel === 'scheduler:sync') {
      logger.info('Received scheduler:sync — reloading monitors');
      try {
        await syncMonitors();
      } catch (err) {
        logger.error({ err }, 'Error during sync triggered by pub/sub');
      }
    }
  });

  await subscriber.subscribe('scheduler:sync');
  logger.info('Subscribed to scheduler:sync channel');
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    await connectDB();

    await syncMonitors();
    await listenForSyncEvents();
    scheduleHourlyAggregation();

    // Periodic re-sync as a fallback (in case pub/sub messages are missed)
    setInterval(async () => {
      try {
        await syncMonitors();
      } catch (err) {
        logger.error({ err }, 'Periodic sync failed');
      }
    }, config.SCHEDULER_SYNC_INTERVAL);

    logger.info('Anchor Scheduler running');
  } catch (err) {
    logger.fatal({ err }, 'Scheduler failed to start');
    process.exit(1);
  }
}

bootstrap();
