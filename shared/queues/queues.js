import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import { QUEUE_NAMES } from './constants.js';

const defaultJobOptions = {
  // Keep the last 100 completed jobs for debugging
  removeOnComplete: { count: 100 },
  // Keep the last 200 failed jobs for inspection and retry
  removeOnFail: { count: 200 },
  // Retry failed jobs up to 3 times with exponential back-off
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
};

/**
 * Queue for dispatching individual monitor HTTP checks.
 * Jobs are added by the scheduler and consumed by worker processes.
 */
export const monitorChecksQueue = new Queue(QUEUE_NAMES.MONITOR_CHECKS, {
  connection: redisConnection,
  defaultJobOptions,
});

/**
 * Queue for sending alert notifications via email/webhook/Slack.
 * Jobs are added by the worker after detecting a status change.
 */
export const alertDispatchQueue = new Queue(QUEUE_NAMES.ALERT_DISPATCH, {
  connection: redisConnection,
  defaultJobOptions: {
    ...defaultJobOptions,
    // Alerts are high priority — retry more aggressively
    attempts: 5,
  },
});

/**
 * Queue for hourly bucket aggregation jobs.
 * Jobs are scheduled by the scheduler on a cron-like basis.
 */
export const dataAggregationQueue = new Queue(QUEUE_NAMES.DATA_AGGREGATION, {
  connection: redisConnection,
  defaultJobOptions,
});
