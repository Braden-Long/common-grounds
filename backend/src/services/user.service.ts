import { prisma } from '../lib/prisma';
import { crypto } from '../lib/crypto';

export const userService = {
  async completeRegistration(
    userId: string,
    phoneNumber: string,
    computingId?: string
  ) {
    // Hash phone number for privacy
    const phoneHash = await crypto.hashPassword(phoneNumber);

    return prisma.user.update({
      where: { id: userId },
      data: {
        phoneHash,
        phoneVerified: true, // In production, would verify via SMS
        computingId: computingId?.toLowerCase(),
      },
    });
  },

  async updateProfile(userId: string, data: { computingId?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        computingId: data.computingId?.toLowerCase(),
      },
    });
  },

  async deleteAccount(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    });
  },

  async searchUsers(query: string, currentUserId: string) {
    // Search by computing ID or email prefix
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            computingId: {
              contains: query.toLowerCase(),
              mode: 'insensitive',
            },
          },
          {
            email: {
              startsWith: query.toLowerCase(),
              mode: 'insensitive',
            },
          },
        ],
        NOT: {
          id: currentUserId, // Exclude current user
        },
      },
      select: {
        id: true,
        email: true,
        computingId: true,
      },
      take: 20, // Limit results
    });

    // Check which users are already friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: currentUserId, status: 'ACCEPTED' },
          { userId2: currentUserId, status: 'ACCEPTED' },
        ],
      },
    });

    const friendIds = new Set(
      friendships.map((f) =>
        f.userId1 === currentUserId ? f.userId2 : f.userId1
      )
    );

    return users.map((user) => ({
      ...user,
      isFriend: friendIds.has(user.id),
    }));
  },
};
