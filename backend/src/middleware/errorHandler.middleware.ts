import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { config } from '../config';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log full error server-side
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    userId: req.user?.userId,
    url: req.url,
    method: req.method,
  });

  // Send appropriate error to client
  if (config.nodeEnv === 'production') {
    res.status(err.status || 500).json({
      error: err.name || 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    });
  } else {
    // Development: send full error
    res.status(err.status || 500).json({
      error: err.name || 'Internal Server Error',
      message: err.message,
      stack: err.stack,
    });
  }
}
