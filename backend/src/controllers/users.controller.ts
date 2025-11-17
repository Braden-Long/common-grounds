import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { z } from 'zod';

const completeRegistrationSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  computingId: z.string().regex(/^[a-zA-Z0-9]{3,10}$/).optional(),
});

const updateProfileSchema = z.object({
  computingId: z.string().regex(/^[a-zA-Z0-9]{3,10}$/).optional(),
});

export const usersController = {
  async completeRegistration(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { phoneNumber, computingId } = completeRegistrationSchema.parse(
        req.body
      );

      const user = await userService.completeRegistration(
        userId,
        phoneNumber,
        computingId
      );

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phoneVerified: user.phoneVerified,
          computingId: user.computingId,
        },
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
        message: 'Failed to complete registration',
      });
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const data = updateProfileSchema.parse(req.body);

      const user = await userService.updateProfile(userId, data);

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          computingId: user.computingId,
          updatedAt: user.updatedAt,
        },
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
        message: 'Failed to update profile',
      });
    }
  },

  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await userService.deleteAccount(userId);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete account',
      });
    }
  },

  async searchUsers(req: Request, res: Response) {
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
  },
};
