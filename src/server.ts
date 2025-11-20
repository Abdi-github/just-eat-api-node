import { createApp } from './app.js';
import config, { validateConfig } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeQueues, shutdownQueues } from './shared/queue/index.js';
import { logger } from './shared/logger/index.js';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Validate configuration
    validateConfig();

    // Connect to databases
    await connectDatabase();
    await connectRedis();

    // Initialize BullMQ queues and workers
    initializeQueues();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(config.port, () => {
      logger.info(`Server started successfully`, {
        port: config.port,
        environment: config.env,
        apiVersion: config.apiVersion,
        healthEndpoint: `http://localhost:${config.port}${config.apiPrefix}/${config.apiVersion}/health`,
      });
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const { disconnectDatabase } = await import('./config/database.js');
          const { disconnectRedis } = await import('./config/redis.js');

          await shutdownQueues();
          await disconnectDatabase();
          await disconnectRedis();

          logger.info('All connections closed. Exiting...');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
