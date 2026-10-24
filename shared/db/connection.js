import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('db');

/**
 * Connects to MongoDB using the URI from config.
 * Attaches connection lifecycle event handlers.
 * Registers SIGINT/SIGTERM handlers for graceful shutdown.
 */
export async function connectDB() {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  await mongoose.connect(config.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  const graceful = async (signal) => {
    logger.info({ signal }, 'Closing MongoDB connection');
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on('SIGINT', graceful.bind(null, 'SIGINT'));
  process.on('SIGTERM', graceful.bind(null, 'SIGTERM'));
}
