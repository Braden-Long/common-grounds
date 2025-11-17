import { prisma } from '../lib/prisma';
import { crypto } from '../lib/crypto';

export const messagesService = {
  async getClassMessages(
    classId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const messages = await prisma.classMessage.findMany({
      where: {
        classId,
        hidden: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        replies: {
          where: { hidden: false },
          take: 5,
        },
      },
    });

    // Get total count
    const total = await prisma.classMessage.count({
      where: {
        classId,
        hidden: false,
      },
    });

    return {
      messages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + messages.length < total,
      },
    };
  },

  async createMessage(
    userId: string,
    classId: string,
    content: string,
    parentMessageId?: string
  ) {
    // Verify user is enrolled in class
    const enrollment = await prisma.userClass.findUnique({
      where: {
        userId_classId: {
          userId,
          classId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('You must be enrolled in this class to post messages');
    }

    // Generate anonymous identifier
    const anonymousIdentifier = crypto.generateAnonymousId(userId, classId);

    // Sanitize content (basic XSS prevention)
    const sanitizedContent = content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim();

    if (!sanitizedContent || sanitizedContent.length > 1000) {
      throw new Error('Message content must be between 1 and 1000 characters');
    }

    // Create message
    const message = await prisma.classMessage.create({
      data: {
        userId,
        classId,
        anonymousIdentifier,
        content: sanitizedContent,
        parentMessageId,
      },
    });

    return message;
  },

  async flagMessage(messageId: string, userId: string) {
    const message = await prisma.classMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Increment flag count
    const updated = await prisma.classMessage.update({
      where: { id: messageId },
      data: {
        flaggedCount: {
          increment: 1,
        },
      },
    });

    // Auto-hide if flagged 5+ times
    if (updated.flaggedCount >= 5) {
      await prisma.classMessage.update({
        where: { id: messageId },
        data: { hidden: true },
      });
    }

    return updated;
  },

  async isUserEnrolledInClass(userId: string, classId: string): Promise<boolean> {
    const enrollment = await prisma.userClass.findUnique({
      where: {
        userId_classId: {
          userId,
          classId,
        },
      },
    });

    return !!enrollment;
  },
};
