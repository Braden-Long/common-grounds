import { Request, Response } from 'express';
import { messagesService } from '../services/messages.service';
import { z } from 'zod';

const createMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  parentMessageId: z.string().uuid().optional(),
});

export const messagesController = {
  async getClassMessages(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { classId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify user is enrolled
      const isEnrolled = await messagesService.isUserEnrolledInClass(
        userId,
        classId
      );

      if (!isEnrolled) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You must be enrolled in this class to view messages',
        });
      }

      const result = await messagesService.getClassMessages(
        classId,
        limit,
        offset
      );

      res.status(200).json({
        success: true,
        messages: result.messages.map((msg: any) => ({
          id: msg.id,
          anonymousIdentifier: msg.anonymousIdentifier,
          content: msg.content,
          createdAt: msg.createdAt,
          replyCount: msg.replies?.length || 0,
          isOwnMessage: msg.userId === userId,
        })),
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch messages',
      });
    }
  },

  async createMessage(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { classId } = req.params;
      const { content, parentMessageId } = createMessageSchema.parse(req.body);

      const message = await messagesService.createMessage(
        userId,
        classId,
        content,
        parentMessageId
      );

      res.status(201).json({
        success: true,
        message: {
          id: message.id,
          anonymousIdentifier: message.anonymousIdentifier,
          content: message.content,
          createdAt: message.createdAt,
          replyCount: 0,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error.errors[0].message,
        });
      }

      if (error.message.includes('not enrolled')) {
        return res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create message',
      });
    }
  },

  async flagMessage(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { messageId } = req.params;

      await messagesService.flagMessage(messageId, userId);

      res.status(200).json({
        success: true,
        message: 'Message flagged for review',
      });
    } catch (error: any) {
      if (error.message === 'Message not found') {
        return res.status(404).json({
          error: 'Not Found',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to flag message',
      });
    }
  },
};
