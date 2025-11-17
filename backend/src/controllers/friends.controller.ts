import { Request, Response } from 'express';
import { friendsService } from '../services/friends.service';
import { classesService } from '../services/classes.service';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
  userId: z.string().uuid().optional(),
  computingId: z.string().optional(),
}).refine(data => data.userId || data.computingId, {
  message: 'Either userId or computingId must be provided',
});

export const friendsController = {
  async sendFriendRequest(req: Request, res: Response) {
    try {
      const fromUserId = req.user!.userId;
      const { userId, computingId } = sendFriendRequestSchema.parse(req.body);

      let toUserId = userId;

      // If computingId provided, find user
      if (computingId && !toUserId) {
        const user = await prisma.user.findFirst({
          where: {
            computingId: computingId.toLowerCase(),
          },
        });

        if (!user) {
          return res.status(404).json({
            error: 'Not Found',
            message: `User with computing ID '${computingId}' not found`,
          });
        }

        toUserId = user.id;
      }

      if (!toUserId) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid user identification',
        });
      }

      const friendship = await friendsService.sendFriendRequest(
        fromUserId,
        toUserId
      );

      res.status(201).json({
        success: true,
        message: 'Friend request sent',
        friendship: {
          id: friendship.id,
          status: friendship.status,
          createdAt: friendship.createdAt,
          user: friendship.user2,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.errors[0].message,
        });
      }

      if (error.message.includes('Already friends') || error.message.includes('already sent')) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send friend request',
      });
    }
  },

  async getFriends(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const friends = await friendsService.getFriends(userId);

      res.status(200).json({
        success: true,
        friends: friends.map((f: any) => ({
          id: f.friend.id,
          email: f.friend.email,
          computingId: f.friend.computingId,
          friendshipId: f.id,
          friendshipCreatedAt: f.createdAt,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch friends',
      });
    }
  },

  async getPendingRequests(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const requests = await friendsService.getPendingRequests(userId);

      res.status(200).json({
        success: true,
        received: requests.received,
        sent: requests.sent,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch friend requests',
      });
    }
  },

  async acceptFriendRequest(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { friendshipId } = req.params;

      const friendship = await friendsService.acceptFriendRequest(
        friendshipId,
        userId
      );

      res.status(200).json({
        success: true,
        message: 'Friend request accepted',
        friendship: {
          id: friendship.id,
          status: friendship.status,
          friend: friendship.user1,
        },
      });
    } catch (error: any) {
      if (error.message === 'Not authorized to accept this request') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to accept friend request',
      });
    }
  },

  async rejectFriendRequest(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { friendshipId } = req.params;

      await friendsService.rejectFriendRequest(friendshipId, userId);

      res.status(200).json({
        success: true,
        message: 'Friend request rejected',
      });
    } catch (error: any) {
      if (error.message === 'Not authorized to reject this request') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to reject friend request',
      });
    }
  },

  async removeFriend(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { friendshipId } = req.params;

      await friendsService.removeFriend(friendshipId, userId);

      res.status(200).json({
        success: true,
        message: 'Friend removed successfully',
      });
    } catch (error: any) {
      if (error.message === 'Not authorized to remove this friendship') {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to remove friend',
      });
    }
  },

  async getCommonClasses(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { friendId } = req.params;

      const commonClasses = await friendsService.getCommonClasses(
        userId,
        friendId
      );

      // Get friend info
      const friend = await prisma.user.findUnique({
        where: { id: friendId },
        select: {
          id: true,
          email: true,
          computingId: true,
        },
      });

      res.status(200).json({
        success: true,
        commonClasses,
        friend,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch common classes',
      });
    }
  },

  async getFriendsInClass(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { classId } = req.params;

      const friends = await friendsService.getFriendsInClass(userId, classId);

      // Get class info
      const classInfo = await classesService.getClassById(classId);

      res.status(200).json({
        success: true,
        class: classInfo,
        friends,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch friends in class',
      });
    }
  },
};
