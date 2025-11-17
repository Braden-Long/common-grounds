import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export const friendsService = {
  async sendFriendRequest(fromUserId: string, toUserId: string) {
    // Check if users are the same
    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: fromUserId, userId2: toUserId },
          { userId1: toUserId, userId2: fromUserId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new Error('Already friends');
      } else if (existing.status === 'PENDING') {
        throw new Error('Friend request already sent');
      }
    }

    // Create friendship
    const friendship = await prisma.friendship.create({
      data: {
        userId1: fromUserId,
        userId2: toUserId,
        status: 'PENDING',
      },
      include: {
        user2: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
      },
    });

    return friendship;
  },

  async getFriends(userId: string) {
    const cacheKey = `user:friends:${userId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: userId, status: 'ACCEPTED' },
          { userId2: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
        user2: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
      },
    });

    const friends = friendships.map((f) => ({
      id: f.id,
      friend: f.userId1 === userId ? f.user2 : f.user1,
      createdAt: f.createdAt,
    }));

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(friends), 3600);

    return friends;
  },

  async getPendingRequests(userId: string) {
    const received = await prisma.friendship.findMany({
      where: {
        userId2: userId,
        status: 'PENDING',
      },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
      },
    });

    const sent = await prisma.friendship.findMany({
      where: {
        userId1: userId,
        status: 'PENDING',
      },
      include: {
        user2: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
      },
    });

    return {
      received: received.map((f) => ({
        friendshipId: f.id,
        from: f.user1,
        createdAt: f.createdAt,
      })),
      sent: sent.map((f) => ({
        friendshipId: f.id,
        to: f.user2,
        createdAt: f.createdAt,
      })),
    };
  },

  async acceptFriendRequest(friendshipId: string, userId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        user1: true,
        user2: true,
      },
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    // Verify that the current user is the recipient
    if (friendship.userId2 !== userId) {
      throw new Error('Not authorized to accept this request');
    }

    // Update status
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: {
        user1: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
      },
    });

    // Invalidate caches
    await redis.del(`user:friends:${friendship.userId1}`);
    await redis.del(`user:friends:${friendship.userId2}`);

    return updated;
  },

  async rejectFriendRequest(friendshipId: string, userId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new Error('Friend request not found');
    }

    // Verify that the current user is the recipient
    if (friendship.userId2 !== userId) {
      throw new Error('Not authorized to reject this request');
    }

    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'REJECTED' },
    });
  },

  async removeFriend(friendshipId: string, userId: string) {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    // Verify that the current user is part of the friendship
    if (friendship.userId1 !== userId && friendship.userId2 !== userId) {
      throw new Error('Not authorized to remove this friendship');
    }

    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    // Invalidate caches
    await redis.del(`user:friends:${friendship.userId1}`);
    await redis.del(`user:friends:${friendship.userId2}`);
  },

  async getCommonClasses(userId: string, friendId: string) {
    const cacheKey = `common:classes:${userId}:${friendId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get user's classes
    const userClasses = await prisma.userClass.findMany({
      where: { userId },
      select: { classId: true },
    });

    // Get friend's classes
    const friendClasses = await prisma.userClass.findMany({
      where: { userId: friendId },
      select: { classId: true },
    });

    const userClassIds = new Set(userClasses.map((uc) => uc.classId));
    const commonClassIds = friendClasses
      .filter((fc) => userClassIds.has(fc.classId))
      .map((fc) => fc.classId);

    // Get full class details
    const commonClasses = await prisma.class.findMany({
      where: {
        id: { in: commonClassIds },
      },
    });

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(commonClasses), 3600);

    return commonClasses;
  },

  async getFriendsInClass(userId: string, classId: string) {
    // Get all friends
    const friends = await this.getFriends(userId);
    const friendIds = friends.map((f) => f.friend.id);

    // Get friends enrolled in this class
    const friendsInClass = await prisma.userClass.findMany({
      where: {
        classId,
        userId: { in: friendIds },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            computingId: true,
          },
        },
      },
    });

    return friendsInClass.map((fc) => fc.user);
  },
};
