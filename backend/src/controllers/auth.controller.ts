import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .email()
    .refine((email) => email.endsWith('@virginia.edu'), {
      message: 'Only @virginia.edu emails are allowed',
    }),
});

export const authController = {
  async requestMagicLink(req: Request, res: Response) {
    try {
      const { email } = requestMagicLinkSchema.parse(req.body);

      await authService.requestMagicLink(email);

      res.status(200).json({
        success: true,
        message: `Magic link sent to ${email}`,
        expiresIn: 900,
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
        message: 'Failed to send magic link',
      });
    }
  },

  async verifyMagicLink(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const { user, jwt } = await authService.verifyMagicLink(token);

      res.status(200).json({
        success: true,
        token: jwt,
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          computingId: user.computingId,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        error: 'Invalid Token',
        message: error.message || 'Magic link is invalid or has expired',
      });
    }
  },

  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const user = await authService.getCurrentUser(userId);

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch user',
      });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await authService.logout(token);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to logout',
      });
    }
  },
};
