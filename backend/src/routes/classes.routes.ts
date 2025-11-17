import { Router } from 'express';
import { classesController } from '../controllers/classes.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/search', authMiddleware, classesController.searchClasses);
router.get('/current-term', authMiddleware, classesController.getCurrentTerm);
router.post('/enroll', authMiddleware, classesController.addClassToUser);
router.get('/my-classes', authMiddleware, classesController.getUserClasses);
router.delete('/:classId', authMiddleware, classesController.removeClassFromUser);

export default router;
