import { createServer } from 'http';
import app from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { redis } from './lib/redis';
import { initializeSocket } from './socket';

const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Initialize Redis connection
redis.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err);
});

// Start server
httpServer.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Frontend URL: ${config.frontendUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
