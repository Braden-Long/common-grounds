import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { magicLinkLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/request-magic-link', magicLinkLimiter, authController.requestMagicLink);
router.get('/verify/:token', authController.verifyMagicLink);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);

export default router;
