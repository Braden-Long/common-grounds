import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { jwtUtils } from '../lib/crypto';
import { messagesService } from '../services/messages.service';
import { logger } from '../lib/logger';
import { config } from '../config';

export function initializeSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwtUtils.verify(token);
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.data.userId})`);

    // Join class room
    socket.on('join-class', async ({ classId }) => {
      try {
        // Verify user is enrolled in class
        const isEnrolled = await messagesService.isUserEnrolledInClass(
          socket.data.userId,
          classId
        );

        if (!isEnrolled) {
          socket.emit('error', {
            message: 'You must be enrolled in this class',
          });
          return;
        }

        socket.join(classId);
        logger.info(`User ${socket.data.userId} joined class ${classId}`);

        socket.emit('joined-class', { classId });
      } catch (error: any) {
        logger.error('Error joining class:', error);
        socket.emit('error', { message: 'Failed to join class' });
      }
    });

    // Leave class room
    socket.on('leave-class', ({ classId }) => {
      socket.leave(classId);
      logger.info(`User ${socket.data.userId} left class ${classId}`);
    });

    // Send message
    socket.on('send-message', async ({ classId, content, parentMessageId }) => {
      try {
        const message = await messagesService.createMessage(
          socket.data.userId,
          classId,
          content,
          parentMessageId
        );

        // Broadcast to all users in the class room
        io.to(classId).emit('new-message', {
          classId,
          message: {
            id: message.id,
            anonymousIdentifier: message.anonymousIdentifier,
            content: message.content,
            createdAt: message.createdAt,
            replyCount: 0,
          },
        });

        logger.info(`Message sent in class ${classId} by user ${socket.data.userId}`);
      } catch (error: any) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ classId, isTyping }) => {
      socket.to(classId).emit('user-typing', {
        classId,
        isTyping,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
