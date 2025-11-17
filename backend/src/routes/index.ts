import { Router } from 'express';
import { userService } from '../services/user.service';
import { authMiddleware } from '../middleware/auth.middleware';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import classesRoutes from './classes.routes';
import friendsRoutes from './friends.routes';
import messagesRoutes from './messages.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Search users (separate from users routes for clarity)
router.get('/search/users', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q as string;
    const userId = req.user!.userId;

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Search query must be at least 2 characters',
      });
    }

    const users = await userService.searchUsers(query, userId);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search users',
    });
  }
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/classes', classesRoutes);
router.use('/friends', friendsRoutes);
router.use('/classes', messagesRoutes); // Messages routes are under /classes/:classId/messages

export default router;
