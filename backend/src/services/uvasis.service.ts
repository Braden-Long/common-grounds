import axios from 'axios';
import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { logger } from '../lib/logger';

interface UVASISClass {
  subject: string;
  catalog_nbr: string;
  class_section: string;
  component: string;
  descr: string;
  class_nbr: string;
  instructor?: string;
  class_capacity?: number;
  enrollment_available?: number;
  days?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
}

export const uvaSISService = {
  getCurrentTerm(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Spring: January - May, Fall: August - December
    const semester = month >= 1 && month <= 5 ? '2' : '8';
    const twoDigitYear = year.toString().slice(-2);

    return `1${twoDigitYear}${semester}`;
  },

  async searchClasses(
    subject: string,
    catalogNumber: string,
    term?: string
  ): Promise<any[]> {
    const actualTerm = term || this.getCurrentTerm();
    const cacheKey = `class:${subject}:${catalogNumber}:${actualTerm}`;

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    try {
      // Call UVA SIS API
      const response = await axios.get(config.uvaSis.apiUrl, {
        params: {
          institution: 'UVA01',
          term: actualTerm,
          subject: subject.toUpperCase(),
          catalog_nbr: catalogNumber,
          page: 1,
        },
        timeout: 10000,
      });

      const classes = Array.isArray(response.data) ? response.data : [];

      if (classes.length === 0) {
        logger.warn(`No classes found for ${subject} ${catalogNumber}`);
      }

      // Cache results for 24 hours
      await redis.set(cacheKey, JSON.stringify(classes), 86400);

      // Store in database
      for (const classData of classes) {
        await this.storeClassInDatabase(classData, actualTerm);
      }

      return classes;
    } catch (error: any) {
      logger.error('UVA SIS API error:', error.message);

      // Try to return from database as fallback
      const dbClasses = await prisma.class.findMany({
        where: {
          subject: subject.toUpperCase(),
          catalogNumber,
          term: actualTerm,
        },
      });

      if (dbClasses.length > 0) {
        logger.info('Returning cached data from database');
        return dbClasses;
      }

      throw new Error('Failed to fetch classes from UVA SIS');
    }
  },

  async storeClassInDatabase(
    classData: UVASISClass,
    term: string
  ): Promise<void> {
    try {
      await prisma.class.upsert({
        where: {
          subject_catalogNumber_term_sisClassNumber: {
            subject: classData.subject,
            catalogNumber: classData.catalog_nbr,
            term: term,
            sisClassNumber: classData.class_nbr,
          },
        },
        update: {
          title: classData.descr,
          instructor: classData.instructor,
          component: classData.component,
          classSection: classData.class_section,
          classCapacity: classData.class_capacity ? parseInt(classData.class_capacity.toString()) : null,
          enrollmentAvailable: classData.enrollment_available ? parseInt(classData.enrollment_available.toString()) : null,
          days: classData.days,
          startTime: classData.start_time,
          endTime: classData.end_time,
          location: classData.location,
          lastSyncedAt: new Date(),
        },
        create: {
          subject: classData.subject,
          catalogNumber: classData.catalog_nbr,
          term: term,
          title: classData.descr,
          sisClassNumber: classData.class_nbr,
          instructor: classData.instructor,
          component: classData.component,
          classSection: classData.class_section,
          classCapacity: classData.class_capacity ? parseInt(classData.class_capacity.toString()) : null,
          enrollmentAvailable: classData.enrollment_available ? parseInt(classData.enrollment_available.toString()) : null,
          days: classData.days,
          startTime: classData.start_time,
          endTime: classData.end_time,
          location: classData.location,
          lastSyncedAt: new Date(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to store class in database:', error.message);
    }
  },

  parseClassInput(input: string): { subject: string; catalogNumber: string } | null {
    const regex = /^([A-Z]{2,4})\s*(\d{4})$/i;
    const match = input.trim().toUpperCase().match(regex);

    if (!match) {
      return null;
    }

    return {
      subject: match[1],
      catalogNumber: match[2],
    };
  },
};
