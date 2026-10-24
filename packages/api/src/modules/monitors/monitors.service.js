import { Monitor, createLogger, redisConnection } from '@anchor/shared';

const logger = createLogger('monitors-service');

const SCHEDULER_SYNC_CHANNEL = 'scheduler:sync';

/**
 * Publishes a sync signal to the scheduler via Redis pub/sub so it
 * picks up any newly added, updated, or removed monitors.
 */
async function publishSchedulerSync() {
  try {
    await redisConnection.publish(SCHEDULER_SYNC_CHANNEL, JSON.stringify({ ts: Date.now() }));
    logger.debug('Published scheduler:sync');
  } catch (err) {
    logger.error({ err }, 'Failed to publish scheduler:sync');
  }
}

/**
 * Creates a new monitor under the given project.
 * @param {string} projectId
 * @param {object} data - Validated monitor fields
 * @returns {object} Created monitor (toJSON)
 */
export async function createMonitor(projectId, data) {
  const monitor = await Monitor.create({ projectId, ...data });
  logger.info({ monitorId: monitor._id, projectId }, 'Monitor created');
  await publishSchedulerSync();
  return monitor.toJSON();
}

/**
 * Returns all monitors for a project, sorted by name ascending.
 * @param {string} projectId
 * @returns {object[]}
 */
export async function getMonitors(projectId) {
  const monitors = await Monitor.find({ projectId }).sort({ name: 1 });
  return monitors.map((m) => m.toJSON());
}

/**
 * Returns a single monitor, verifying it belongs to `projectId`.
 * @param {string} projectId
 * @param {string} monitorId
 * @returns {object}
 */
export async function getMonitor(projectId, monitorId) {
  const monitor = await Monitor.findOne({ _id: monitorId, projectId });

  if (!monitor) {
    const err = new Error('Monitor not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return monitor.toJSON();
}

/**
 * Updates a monitor's fields.
 * @param {string} projectId
 * @param {string} monitorId
 * @param {object} data - Partial monitor fields
 * @returns {object} Updated monitor
 */
export async function updateMonitor(projectId, monitorId, data) {
  const monitor = await Monitor.findOneAndUpdate(
    { _id: monitorId, projectId },
    { $set: data },
    { new: true, runValidators: true },
  );

  if (!monitor) {
    const err = new Error('Monitor not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  logger.info({ monitorId, projectId }, 'Monitor updated');
  await publishSchedulerSync();
  return monitor.toJSON();
}

/**
 * Permanently deletes a monitor.
 * @param {string} projectId
 * @param {string} monitorId
 */
export async function deleteMonitor(projectId, monitorId) {
  const monitor = await Monitor.findOneAndDelete({ _id: monitorId, projectId });

  if (!monitor) {
    const err = new Error('Monitor not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  logger.info({ monitorId, projectId }, 'Monitor deleted');
  await publishSchedulerSync();
}

/**
 * Flips the `isActive` flag on a monitor.
 * @param {string} projectId
 * @param {string} monitorId
 * @returns {object} Updated monitor
 */
export async function toggleMonitor(projectId, monitorId) {
  const monitor = await Monitor.findOne({ _id: monitorId, projectId });

  if (!monitor) {
    const err = new Error('Monitor not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  monitor.isActive = !monitor.isActive;
  await monitor.save();

  logger.info({ monitorId, projectId, isActive: monitor.isActive }, 'Monitor toggled');
  await publishSchedulerSync();
  return monitor.toJSON();
}
