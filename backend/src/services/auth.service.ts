import { prisma } from '../lib/prisma';
import { crypto, jwtUtils } from '../lib/crypto';
import { emailService } from './email.service';
import { logger } from '../lib/logger';

export const authService = {
  async requestMagicLink(email: string): Promise<void> {
    // Validate email domain
    if (!email.endsWith('@virginia.edu')) {
      throw new Error('Only @virginia.edu emails are allowed');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          emailVerified: false,
        },
      });
      logger.info(`New user created: ${normalizedEmail}`);
    }

    // Generate random token
    const token = crypto.generateToken(32);
    const tokenHash = crypto.sha256(token);

    // Store hashed token in database
    await prisma.magicLink.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        used: false,
      },
    });

    // Send email with magic link
    await emailService.sendMagicLink(normalizedEmail, token);
  },

  async verifyMagicLink(token: string): Promise<{ user: any; jwt: string }> {
    const tokenHash = crypto.sha256(token);

    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!magicLink) {
      throw new Error('Invalid or expired magic link');
    }

    // Check expiration
    if (magicLink.expiresAt < new Date()) {
      throw new Error('Magic link has expired');
    }

    // Check if already used
    if (magicLink.used) {
      throw new Error('Magic link has already been used');
    }

    // Mark as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    });

    // Update user email verification
    await prisma.user.update({
      where: { id: magicLink.userId },
      data: { emailVerified: true },
    });

    // Generate JWT
    const jwtToken = jwtUtils.sign({
      userId: magicLink.user.id,
      email: magicLink.user.email,
    });

    // Create session
    const sessionTokenHash = crypto.sha256(jwtToken);
    await prisma.session.create({
      data: {
        userId: magicLink.user.id,
        tokenHash: sessionTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info(`User logged in: ${magicLink.user.email}`);

    return {
      user: magicLink.user,
      jwt: jwtToken,
    };
  },

  async validateToken(token: string): Promise<any> {
    try {
      const decoded = jwtUtils.verify(token);

      // Check if session exists and is not expired
      const tokenHash = crypto.sha256(token);
      const session = await prisma.session.findUnique({
        where: { tokenHash },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new Error('Session expired');
      }

      // Update last used
      await prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  async logout(token: string): Promise<void> {
    const tokenHash = crypto.sha256(token);
    await prisma.session
      .delete({
        where: { tokenHash },
      })
      .catch(() => {
        // Session might already be deleted, ignore error
      });
  },

  async getCurrentUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        phoneVerified: true,
        computingId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },
};
