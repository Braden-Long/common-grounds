import { Router } from 'express';
import { messagesController } from '../controllers/messages.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { messageLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.get('/:classId/messages', authMiddleware, messagesController.getClassMessages);
router.post('/:classId/messages', authMiddleware, messageLimiter, messagesController.createMessage);
router.post('/messages/:messageId/flag', authMiddleware, messagesController.flagMessage);

export default router;
