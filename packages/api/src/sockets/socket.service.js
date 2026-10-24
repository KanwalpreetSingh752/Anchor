import { createRedisConnection, createLogger } from '@anchor/shared';

const logger = createLogger('socket-bridge');

/**
 * Initializes Redis Pub/Sub subscription and bridges incoming worker events
 * to connected Socket.IO clients joined to project rooms.
 *
 * @param {import('socket.io').Server} io
 * @returns {import('ioredis').Redis}
 */
export function initRedisSocketBridge(io) {
  const subscriber = createRedisConnection();

  subscriber.psubscribe('events:project:*', (err, count) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to Redis pub/sub channel events:project:*');
    } else {
      logger.info({ count }, 'Subscribed to Redis pub/sub pattern events:project:*');
    }
  });

  subscriber.on('pmessage', (_pattern, channel, message) => {
    try {
      // Channel pattern is "events:project:<projectId>"
      const prefix = 'events:project:';
      if (!channel.startsWith(prefix)) return;

      const projectId = channel.slice(prefix.length);
      if (!projectId) return;

      const parsed = JSON.parse(message);
      const eventName = parsed.event || parsed.type;
      const eventData = parsed.data !== undefined ? parsed.data : parsed;

      if (eventName) {
        io.to(`project:${projectId}`).emit(eventName, eventData);
        logger.debug(
          { projectId, event: eventName },
          'Relayed Redis pub/sub event to Socket.IO room',
        );
      }
    } catch (err) {
      logger.error({ err, channel }, 'Failed to process and relay Redis pub/sub message');
    }
  });

  return subscriber;
}
