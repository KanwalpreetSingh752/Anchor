import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('redis');

/**
 * Creates a new IORedis connection configured for BullMQ usage.
 * BullMQ requires maxRetriesPerRequest: null and enableReadyCheck: false.
 * @returns {Redis}
 */
export function createRedisConnection() {
  const conn = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });

  conn.on('connect', () => logger.info('Redis connected'));
  conn.on('ready', () => logger.debug('Redis ready'));
  conn.on('error', (err) => logger.error({ err }, 'Redis error'));
  conn.on('close', () => logger.warn('Redis connection closed'));
  conn.on('reconnecting', (delay) => logger.info({ delay }, 'Redis reconnecting'));

  return conn;
}

/** Singleton Redis connection shared across the process. */
export const redisConnection = createRedisConnection();
