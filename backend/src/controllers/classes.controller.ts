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

export const classesController = {
  async searchClasses(req: Request, res: Response) {
    try {
      const { subject, number, term } = searchClassesSchema.parse(req.query);

      const classes = await classesService.searchClasses(subject, number, term);

      res.status(200).json({
        success: true,
        classes,
        cached: true,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.errors[0].message,
        });
      }

      if (error.message === 'Failed to fetch classes from UVA SIS') {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'UVA SIS API is temporarily unavailable',
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search classes',
      });
    }
  },

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
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.errors[0].message,
        });
      }

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
  },

  async getUserClasses(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const term = req.query.term as string | undefined;

      const classes = await classesService.getUserClasses(userId, term);

      res.status(200).json({
        success: true,
        classes: classes.map((uc: any) => ({
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
  },

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
  },

  async getCurrentTerm(req: Request, res: Response) {
    try {
      const term = uvaSISService.getCurrentTerm();
      res.status(200).json({
        success: true,
        term,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get current term',
      });
    }
  },
};
