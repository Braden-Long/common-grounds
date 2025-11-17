import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { uvaSISService } from './uvasis.service';

export const classesService = {
  async searchClasses(subject: string, catalogNumber: string, term?: string) {
    return uvaSISService.searchClasses(subject, catalogNumber, term);
  },

  async addClassToUser(
    userId: string,
    subject: string,
    catalogNumber: string,
    term: string,
    sisClassNumber?: string
  ) {
    // Ensure the class exists in our database
    const classes = await uvaSISService.searchClasses(
      subject,
      catalogNumber,
      term
    );

    if (classes.length === 0) {
      throw new Error('Class not found in UVA SIS');
    }

    // Find specific section if provided
    let targetClass = classes[0];
    if (sisClassNumber) {
      targetClass =
        classes.find((c: any) => c.class_nbr === sisClassNumber) || classes[0];
    }

    // Find class in database
    const dbClass = await prisma.class.findFirst({
      where: {
        subject,
        catalogNumber,
        term,
        sisClassNumber: targetClass.class_nbr,
      },
    });

    if (!dbClass) {
      throw new Error('Class not found in database');
    }

    // Check if already enrolled
    const existing = await prisma.userClass.findUnique({
      where: {
        userId_classId: {
          userId,
          classId: dbClass.id,
        },
      },
    });

    if (existing) {
      throw new Error('Already enrolled in this class');
    }

    // Add class to user
    const userClass = await prisma.userClass.create({
      data: {
        userId,
        classId: dbClass.id,
      },
      include: {
        class: true,
      },
    });

    // Invalidate caches
    await redis.del(`user:classes:${userId}`);
    await redis.delPattern(`common:classes:${userId}:*`);

    return userClass;
  },

  async getUserClasses(userId: string, term?: string) {
    const cacheKey = `user:classes:${userId}${term ? `:${term}` : ''}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const userClasses = await prisma.userClass.findMany({
      where: {
        userId,
        ...(term && {
          class: {
            term,
          },
        }),
      },
      include: {
        class: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    // Cache for 1 hour
    await redis.set(cacheKey, JSON.stringify(userClasses), 3600);

    return userClasses;
  },

  async removeClassFromUser(userId: string, classId: string) {
    await prisma.userClass.delete({
      where: {
        userId_classId: {
          userId,
          classId,
        },
      },
    });

    // Invalidate caches
    await redis.del(`user:classes:${userId}`);
    await redis.delPattern(`common:classes:${userId}:*`);
  },

  async getClassById(classId: string) {
    return prisma.class.findUnique({
      where: { id: classId },
    });
  },
};
