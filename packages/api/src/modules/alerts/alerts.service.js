import http from 'http';
import https from 'https';
import { URL } from 'url';
import { AlertChannel, Monitor, createLogger } from '@anchor/shared';

const logger = createLogger('alerts-service');

/**
 * Returns all alert channels for a project.
 *
 * @param {string} projectId
 * @returns {Promise<object[]>}
 */
export async function getAlertChannels(projectId) {
  const channels = await AlertChannel.find({ projectId }).sort({ createdAt: -1 });
  return channels.map((c) => c.toJSON());
}

/**
 * Creates a new alert channel.
 *
 * @param {string} projectId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createAlertChannel(projectId, data) {
  const channel = await AlertChannel.create({
    projectId,
    ...data,
  });

  logger.info({ channelId: channel._id, projectId }, 'Alert channel created');
  return channel.toJSON();
}

/**
 * Gets a single alert channel by ID.
 *
 * @param {string} projectId
 * @param {string} channelId
 * @returns {Promise<object>}
 */
export async function getAlertChannel(projectId, channelId) {
  const channel = await AlertChannel.findOne({ _id: channelId, projectId });

  if (!channel) {
    const err = new Error('Alert channel not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return channel.toJSON();
}

/**
 * Updates an alert channel.
 *
 * @param {string} projectId
 * @param {string} channelId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateAlertChannel(projectId, channelId, data) {
  const channel = await AlertChannel.findOneAndUpdate(
    { _id: channelId, projectId },
    { $set: data },
    { new: true, runValidators: true },
  );

  if (!channel) {
    const err = new Error('Alert channel not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  logger.info({ channelId, projectId }, 'Alert channel updated');
  return channel.toJSON();
}

/**
 * Deletes an alert channel and removes references from monitors.
 *
 * @param {string} projectId
 * @param {string} channelId
 */
export async function deleteAlertChannel(projectId, channelId) {
  const channel = await AlertChannel.findOneAndDelete({ _id: channelId, projectId });

  if (!channel) {
    const err = new Error('Alert channel not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Remove channel reference from all monitors belonging to this project
  await Monitor.updateMany(
    { projectId, alertChannels: channelId },
    { $pull: { alertChannels: channelId } },
  );

  logger.info({ channelId, projectId }, 'Alert channel deleted');
}

/**
 * Sends a test alert through the channel.
 *
 * @param {string} projectId
 * @param {string} channelId
 * @returns {Promise<{ delivered: boolean, message: string }>}
 */
export async function testChannel(projectId, channelId) {
  const channel = await AlertChannel.findOne({ _id: channelId, projectId });

  if (!channel) {
    const err = new Error('Alert channel not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const payload = JSON.stringify({
    type: 'TEST',
    channelName: channel.name,
    message: 'This is a test alert notification from Anchor.',
    timestamp: new Date().toISOString(),
  });

  if (channel.type === 'WEBHOOK' || channel.type === 'SLACK') {
    const webhookUrl = channel.config?.webhookUrl || channel.config?.url;
    if (!webhookUrl) {
      const err = new Error('Webhook URL is not configured.');
      err.statusCode = 400;
      err.code = 'INVALID_CONFIG';
      throw err;
    }

    const parsed = new URL(webhookUrl);
    const lib = parsed.protocol === 'https:' ? https : http;

    await new Promise((resolve, reject) => {
      const req = lib.request(
        {
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
          path: parsed.pathname + parsed.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 10000,
        },
        (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            const err = new Error(`Webhook endpoint responded with HTTP ${res.statusCode}`);
            err.statusCode = 400;
            err.code = 'TEST_ALERT_FAILED';
            reject(err);
          }
          res.resume();
        },
      );

      req.on('timeout', () => {
        req.destroy();
        const err = new Error('Webhook request timed out.');
        err.statusCode = 504;
        err.code = 'TEST_ALERT_TIMEOUT';
        reject(err);
      });

      req.on('error', (err) => {
        const customErr = new Error(`Failed to deliver webhook: ${err.message}`);
        customErr.statusCode = 400;
        customErr.code = 'TEST_ALERT_FAILED';
        reject(customErr);
      });

      req.write(payload);
      req.end();
    });

    return {
      delivered: true,
      message: `Test notification sent successfully to ${channel.type} endpoint.`,
    };
  }

  if (channel.type === 'EMAIL') {
    logger.info({ channelId, email: channel.config?.address }, 'Test email triggered (stub)');
    return {
      delivered: true,
      message: `Test email notification simulated for ${channel.config?.address}.`,
    };
  }

  throw new Error(`Unsupported channel type: ${channel.type}`);
}
