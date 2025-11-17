import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/complete-registration', authMiddleware, usersController.completeRegistration);
router.put('/profile', authMiddleware, usersController.updateProfile);
router.delete('/account', authMiddleware, usersController.deleteAccount);

export default router;
