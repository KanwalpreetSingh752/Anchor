import pino from 'pino';
import { config } from '../config/index.js';

const transport =
  config.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard' },
      }
    : undefined;

const rootLogger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport,
});

/**
 * Factory that returns a child logger bound to the given module name.
 * @param {string} name - Module identifier shown in log output.
 * @returns {pino.Logger}
 */
export const createLogger = (name) => rootLogger.child({ module: name });

export default rootLogger;
