import { Router } from 'express';
import { friendsController } from '../controllers/friends.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/request', authMiddleware, friendsController.sendFriendRequest);
router.get('/', authMiddleware, friendsController.getFriends);
router.get('/requests', authMiddleware, friendsController.getPendingRequests);
router.put('/requests/:friendshipId/accept', authMiddleware, friendsController.acceptFriendRequest);
router.put('/requests/:friendshipId/reject', authMiddleware, friendsController.rejectFriendRequest);
router.delete('/:friendshipId', authMiddleware, friendsController.removeFriend);
router.get('/:friendId/common-classes', authMiddleware, friendsController.getCommonClasses);

export default router;
