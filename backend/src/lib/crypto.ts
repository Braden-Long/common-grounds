import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const crypto = {
  // Generate random token
  generateToken(bytes: number = 32): string {
    return randomBytes(bytes).toString('hex');
  },

  // SHA-256 hash
  sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  },

  // Bcrypt hash (for phone numbers)
  async hashPassword(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  },

  // Bcrypt compare
  async comparePassword(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  },

  // Generate anonymous identifier for user in class
  generateAnonymousId(userId: string, classId: string): string {
    const hash = this.sha256(`${userId}:${classId}`);
    return `Anon_${hash.substring(0, 6)}`;
  },
};

export const jwtUtils = {
  sign(payload: any): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiration,
    });
  },

  verify(token: string): any {
    return jwt.verify(token, config.jwt.secret);
  },
};
