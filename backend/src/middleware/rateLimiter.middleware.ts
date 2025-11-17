import rateLimit from 'express-rate-limit';

export const magicLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    error: 'Too Many Requests',
    message: 'Too many magic link requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
});

export const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 messages per hour per class
  keyGenerator: (req) => `${req.user?.userId}:${req.params.classId}`,
  message: {
    error: 'Too Many Requests',
    message: 'Too many messages. Please slow down.',
  },
});
