# UVA SIS API Integration Templates

## Backend - UVA SIS Service

```typescript
// backend/src/services/uvasis.service.ts
import axios from 'axios';
import { cacheService } from './cache.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface UVASISClass {
  subject: string;
  catalog_nbr: string;
  class_section: string;
  component: string;
  descr: string;
  class_nbr: string;
  instructor: string;
  class_capacity: number;
  enrollment_available: number;
  days: string;
  start_time: string;
  end_time: string;
  location: string;
}

export class UVASISService {
  private baseURL = process.env.UVA_SIS_API_URL!;
  private institution = 'UVA01';

  /**
   * Get current term code based on current date
   * Format: "1" + [2-digit year] + [2 for Spring / 8 for Fall]
   */
  getCurrentTerm(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // Spring: January (1) - May (5)
    // Fall: August (8) - December (12)
    // Default to Fall if June-July
    const semester = month >= 1 && month <= 5 ? '2' : '8';
    const twoDigitYear = year.toString().slice(-2);

    return `1${twoDigitYear}${semester}`;
  }

  /**
   * Search for classes by subject and catalog number
   */
  async searchClasses(
    subject: string,
    catalogNumber: string,
    term?: string
  ): Promise<any[]> {
    const actualTerm = term || this.getCurrentTerm();
    const cacheKey = `class:${subject}:${catalogNumber}:${actualTerm}`;

    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Call UVA SIS API
      const response = await axios.get(this.baseURL, {
        params: {
          institution: this.institution,
          term: actualTerm,
          subject: subject.toUpperCase(),
          catalog_nbr: catalogNumber,
          page: 1,
        },
        timeout: 10000, // 10 second timeout
      });

      const classes = Array.isArray(response.data) ? response.data : [];

      // Cache results for 24 hours
      await cacheService.set(cacheKey, JSON.stringify(classes), 86400);

      // Store in database
      for (const classData of classes) {
        await this.storeClassInDatabase(classData, actualTerm);
      }

      return classes;
    } catch (error: any) {
      console.error('UVA SIS API error:', error.message);
      throw new Error('Failed to fetch classes from UVA SIS');
    }
  }

  /**
   * Store class data in database
   */
  private async storeClassInDatabase(
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
          classCapacity: parseInt(classData.class_capacity?.toString() || '0'),
          enrollmentAvailable: parseInt(classData.enrollment_available?.toString() || '0'),
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
          classCapacity: parseInt(classData.class_capacity?.toString() || '0'),
          enrollmentAvailable: parseInt(classData.enrollment_available?.toString() || '0'),
          days: classData.days,
          startTime: classData.start_time,
          endTime: classData.end_time,
          location: classData.location,
          lastSyncedAt: new Date(),
        },
      });
    } catch (error: any) {
      console.error('Failed to store class in database:', error.message);
    }
  }

  /**
   * Get all available subjects/departments
   */
  async getSubjects(term?: string): Promise<string[]> {
    const actualTerm = term || this.getCurrentTerm();
    const cacheKey = `subjects:${actualTerm}`;

    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const optionsURL = this.baseURL.replace(
        'IScript_ClassSearch',
        'IScript_ClassSearchOptions'
      );

      const response = await axios.get(optionsURL, {
        params: {
          institution: this.institution,
          term: actualTerm,
        },
        timeout: 10000,
      });

      const subjects = response.data.subjects || [];

      // Cache for 7 days (subjects don't change often)
      await cacheService.set(cacheKey, JSON.stringify(subjects), 604800);

      return subjects;
    } catch (error: any) {
      console.error('Failed to fetch subjects:', error.message);
      throw new Error('Failed to fetch subjects from UVA SIS');
    }
  }

  /**
   * Parse class input like "CS 3120" into subject and catalog number
   */
  parseClassInput(input: string): { subject: string; catalogNumber: string } | null {
    // Regex to match "CS 3120", "CS3120", "MATH 1320", etc.
    const regex = /^([A-Z]{2,4})\s*(\d{4})$/i;
    const match = input.trim().toUpperCase().match(regex);

    if (!match) {
      return null;
    }

    return {
      subject: match[1],
      catalogNumber: match[2],
    };
  }
}

export const uvaSISService = new UVASISService();
```

## Backend - Cache Service (Redis)

```typescript
// backend/src/services/cache.service.ts
import { createClient } from 'redis';

class CacheService {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.connect();
  }

  private async connect() {
    await this.client.connect();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }
}

export const cacheService = new CacheService();
```

## Backend - Classes Service

```typescript
// backend/src/services/classes.service.ts
import { PrismaClient } from '@prisma/client';
import { uvaSISService } from './uvasis.service';
import { cacheService } from './cache.service';

const prisma = new PrismaClient();

export class ClassesService {
  /**
   * Search for classes
   */
  async searchClasses(subject: string, catalogNumber: string, term?: string) {
    return uvaSISService.searchClasses(subject, catalogNumber, term);
  }

  /**
   * Add class to user's schedule
   */
  async addClassToUser(
    userId: string,
    subject: string,
    catalogNumber: string,
    term: string,
    sisClassNumber?: string
  ) {
    // First, ensure the class exists in our database
    const classes = await uvaSISService.searchClasses(subject, catalogNumber, term);

    if (classes.length === 0) {
      throw new Error('Class not found in UVA SIS');
    }

    // If specific section provided, find it
    let targetClass = classes[0];
    if (sisClassNumber) {
      targetClass = classes.find((c) => c.class_nbr === sisClassNumber) || classes[0];
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

    // Check if user already enrolled
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
    await cacheService.del(`user:classes:${userId}`);
    await cacheService.delPattern(`common:classes:${userId}:*`);

    return userClass;
  }

  /**
   * Get user's classes
   */
  async getUserClasses(userId: string, term?: string) {
    const cacheKey = `user:classes:${userId}${term ? `:${term}` : ''}`;

    // Check cache
    const cached = await cacheService.get(cacheKey);
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
    await cacheService.set(cacheKey, JSON.stringify(userClasses), 3600);

    return userClasses;
  }

  /**
   * Remove class from user's schedule
   */
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
    await cacheService.del(`user:classes:${userId}`);
    await cacheService.delPattern(`common:classes:${userId}:*`);
  }
}

export const classesService = new ClassesService();
```

## Backend - Classes Controller

```typescript
// backend/src/controllers/classes.controller.ts
import { Request, Response } from 'express';
import { classesService } from '../services/classes.service';
import { uvaSISService } from '../services/uvasis.service';
import { z } from 'zod';

const searchClassesSchema = z.object({
  subject: z.string().min(2).max(4),
  number: z.string().length(4),
  term: z.string().length(4).optional(),
});

const addClassSchema = z.object({
  subject: z.string().min(2).max(4),
  catalogNumber: z.string().length(4),
  term: z.string().length(4),
  sisClassNumber: z.string().optional(),
});

export class ClassesController {
  async searchClasses(req: Request, res: Response) {
    try {
      const { subject, number, term } = searchClassesSchema.parse(req.query);

      const classes = await classesService.searchClasses(
        subject,
        number,
        term
      );

      res.status(200).json({
        success: true,
        classes,
        cached: true, // Could track this better
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.errors[0].message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to search classes',
      });
    }
  }

  async getSubjects(req: Request, res: Response) {
    try {
      const term = req.query.term as string | undefined;
      const subjects = await uvaSISService.getSubjects(term);

      res.status(200).json({
        success: true,
        subjects,
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch subjects',
      });
    }
  }

  async addClassToUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { subject, catalogNumber, term, sisClassNumber } =
        addClassSchema.parse(req.body);

      const userClass = await classesService.addClassToUser(
        userId,
        subject,
        catalogNumber,
        term,
        sisClassNumber
      );

      res.status(201).json({
        success: true,
        message: 'Class added successfully',
        class: {
          id: userClass.class.id,
          subject: userClass.class.subject,
          catalogNumber: userClass.class.catalogNumber,
          term: userClass.class.term,
          title: userClass.class.title,
          enrolledAt: userClass.enrolledAt,
        },
      });
    } catch (error: any) {
      if (error.message === 'Already enrolled in this class') {
        return res.status(400).json({
          error: 'Already Enrolled',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to add class',
      });
    }
  }

  async getUserClasses(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const term = req.query.term as string | undefined;

      const classes = await classesService.getUserClasses(userId, term);

      res.status(200).json({
        success: true,
        classes: classes.map((uc) => ({
          id: uc.class.id,
          subject: uc.class.subject,
          catalogNumber: uc.class.catalogNumber,
          term: uc.class.term,
          title: uc.class.title,
          instructor: uc.class.instructor,
          enrolledAt: uc.enrolledAt,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch classes',
      });
    }
  }

  async removeClassFromUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { classId } = req.params;

      await classesService.removeClassFromUser(userId, classId);

      res.status(200).json({
        success: true,
        message: 'Class removed successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to remove class',
      });
    }
  }
}
```

## Frontend - Class Search Component

```typescript
// frontend/src/features/classes/components/ClassSearch.tsx
import { useState, useEffect } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { classesApi } from '../api/classesApi';
import { parseClassInput } from '@/shared/utils/classParser';
import { Input } from '@/shared/components/ui/Input';
import { ClassCard } from './ClassCard';
import { Spinner } from '@/shared/components/ui/Spinner';

export function ClassSearch() {
  const [searchInput, setSearchInput] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debounce search input (500ms)
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    async function search() {
      if (!debouncedSearch) {
        setClasses([]);
        return;
      }

      // Parse input (e.g., "CS 3120")
      const parsed = parseClassInput(debouncedSearch);
      if (!parsed) {
        setError('Invalid format. Try "CS 3120"');
        return;
      }

      setError('');
      setLoading(true);

      try {
        const response = await classesApi.searchClasses(
          parsed.subject,
          parsed.catalogNumber
        );
        setClasses(response.classes);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to search classes');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [debouncedSearch]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search classes (e.g., CS 3120)"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />

      {loading && (
        <div className="flex justify-center">
          <Spinner />
        </div>
      )}

      {error && <div className="text-red-600">{error}</div>}

      {classes.length > 0 && (
        <div className="space-y-2">
          {classes.map((classData) => (
            <ClassCard
              key={classData.class_nbr}
              classData={classData}
            />
          ))}
        </div>
      )}

      {!loading && debouncedSearch && classes.length === 0 && !error && (
        <div className="text-gray-500 text-center">
          No classes found
        </div>
      )}
    </div>
  );
}
```

## Frontend - Class Parser Utility

```typescript
// frontend/src/shared/utils/classParser.ts
export function parseClassInput(input: string): {
  subject: string;
  catalogNumber: string;
} | null {
  // Regex to match "CS 3120", "CS3120", "MATH 1320", etc.
  const regex = /^([A-Z]{2,4})\s*(\d{4})$/i;
  const match = input.trim().toUpperCase().match(regex);

  if (!match) {
    return null;
  }

  return {
    subject: match[1],
    catalogNumber: match[2],
  };
}

export function formatClassCode(subject: string, catalogNumber: string): string {
  return `${subject} ${catalogNumber}`;
}
```

## Background Job - Sync Popular Classes

```typescript
// backend/src/jobs/syncClasses.job.ts
import cron from 'node-cron';
import { uvaSISService } from '../services/uvasis.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of popular classes to sync nightly
const POPULAR_CLASSES = [
  { subject: 'CS', catalogNumber: '1110' },
  { subject: 'CS', catalogNumber: '2100' },
  { subject: 'CS', catalogNumber: '2150' },
  { subject: 'CS', catalogNumber: '3120' },
  { subject: 'MATH', catalogNumber: '1310' },
  { subject: 'MATH', catalogNumber: '1320' },
  // Add more popular classes
];

export function initializeSyncClassesJob() {
  // Run every night at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting nightly class sync...');

    const term = uvaSISService.getCurrentTerm();

    for (const classInfo of POPULAR_CLASSES) {
      try {
        await uvaSISService.searchClasses(
          classInfo.subject,
          classInfo.catalogNumber,
          term
        );
        console.log(`Synced ${classInfo.subject} ${classInfo.catalogNumber}`);
      } catch (error: any) {
        console.error(`Failed to sync ${classInfo.subject} ${classInfo.catalogNumber}:`, error.message);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log('Nightly class sync completed');
  });
}
```

---

This template provides complete UVA SIS API integration with:
- API client with error handling
- Redis caching for performance
- Database storage for classes
- Search functionality
- Frontend components with debouncing
- Background job for syncing popular classes
