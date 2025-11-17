# Authentication Implementation Templates

## Backend - Authentication Service

```typescript
// backend/src/services/auth.service.ts
import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { sendEmail } from './email.service';

const prisma = new PrismaClient();

export class AuthService {
  /**
   * Generate and send magic link to user's email
   */
  async requestMagicLink(email: string): Promise<void> {
    // Validate email domain
    if (!email.endsWith('@virginia.edu')) {
      throw new Error('Only @virginia.edu emails are allowed');
    }

    // Normalize email
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
    }

    // Generate random token
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

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
    const magicLink = `${process.env.FRONTEND_URL}/verify/${token}`;
    await sendEmail({
      to: normalizedEmail,
      subject: 'Your Common Grounds login link',
      html: `
        <h1>Welcome to Common Grounds!</h1>
        <p>Click the link below to log in:</p>
        <a href="${magicLink}">Log in to Common Grounds</a>
        <p>This link expires in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  /**
   * Verify magic link token and create session
   */
  async verifyMagicLink(token: string): Promise<{ user: any; jwt: string }> {
    // Hash the provided token
    const tokenHash = createHash('sha256').update(token).digest('hex');

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
    const jwtToken = jwt.sign(
      {
        userId: magicLink.user.id,
        email: magicLink.user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRATION || '7d' }
    );

    // Create session
    const sessionTokenHash = createHash('sha256').update(jwtToken).digest('hex');
    await prisma.session.create({
      data: {
        userId: magicLink.user.id,
        tokenHash: sessionTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: magicLink.user,
      jwt: jwtToken,
    };
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Check if session exists and is not expired
      const tokenHash = createHash('sha256').update(token).digest('hex');
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
  }

  /**
   * Logout and invalidate session
   */
  async logout(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await prisma.session.delete({
      where: { tokenHash },
    }).catch(() => {
      // Session might already be deleted, ignore error
    });
  }
}
```

## Backend - Auth Middleware

```typescript
// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token
    const decoded = await authService.validateToken(token);

    // Attach user to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}
```

## Backend - Auth Controller

```typescript
// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const authService = new AuthService();

// Validation schemas
const requestMagicLinkSchema = z.object({
  email: z.string().email().endsWith('@virginia.edu', {
    message: 'Only @virginia.edu emails are allowed',
  }),
});

const verifyTokenSchema = z.object({
  token: z.string().min(32),
});

export class AuthController {
  async requestMagicLink(req: Request, res: Response) {
    try {
      // Validate input
      const { email } = requestMagicLinkSchema.parse(req.body);

      // Send magic link
      await authService.requestMagicLink(email);

      res.status(200).json({
        success: true,
        message: `Magic link sent to ${email}`,
        expiresIn: 900, // 15 minutes in seconds
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
  }

  async verifyMagicLink(req: Request, res: Response) {
    try {
      // Validate input
      const { token } = req.params;

      // Verify magic link
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
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      // User is attached by auth middleware
      const userId = req.user!.userId;

      // Fetch full user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.status(200).json({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        computingId: user.computingId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch user',
      });
    }
  }

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
  }
}
```

## Backend - Auth Routes

```typescript
// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post(
  '/request-magic-link',
  rateLimiter.magicLink,
  authController.requestMagicLink
);

router.get(
  '/verify/:token',
  authController.verifyMagicLink
);

// Protected routes
router.get(
  '/me',
  authMiddleware,
  authController.getCurrentUser
);

router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

export default router;
```

## Frontend - Auth Store (Zustand)

```typescript
// frontend/src/features/auth/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  computingId: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
);
```

## Frontend - Auth API Client

```typescript
// frontend/src/features/auth/api/authApi.ts
import { apiClient } from '@/shared/utils/api';

export interface RequestMagicLinkParams {
  email: string;
}

export interface VerifyMagicLinkResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    computingId: string | null;
    createdAt: string;
  };
}

export const authApi = {
  requestMagicLink: async (email: string) => {
    const response = await apiClient.post('/auth/request-magic-link', { email });
    return response.data;
  },

  verifyMagicLink: async (token: string): Promise<VerifyMagicLinkResponse> => {
    const response = await apiClient.get(`/auth/verify/${token}`);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};
```

## Frontend - Login Component

```typescript
// frontend/src/features/auth/components/LoginForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Alert } from '@/shared/components/ui/Alert';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authApi.requestMagicLink(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Log in to Common Grounds</h2>

      {success ? (
        <Alert type="success">
          Check your email! We've sent you a magic link to log in.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              UVA Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="abc1de@virginia.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              pattern=".*@virginia\.edu$"
              title="Please use your @virginia.edu email"
            />
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <Button type="submit" fullWidth loading={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </form>
      )}

      <p className="mt-4 text-sm text-gray-600 text-center">
        We'll send you a link to log in without a password.
      </p>
    </div>
  );
}
```

## Frontend - Magic Link Verify Component

```typescript
// frontend/src/features/auth/components/MagicLinkVerify.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '@/shared/components/ui/Spinner';
import { Alert } from '@/shared/components/ui/Alert';

export function MagicLinkVerify() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError('Invalid magic link');
        return;
      }

      try {
        const response = await authApi.verifyMagicLink(token);
        setAuth(response.user, response.token);

        // Redirect based on user completion status
        if (!response.user.phoneVerified) {
          navigate('/complete-registration');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to verify magic link');
      }
    }

    verify();
  }, [token, navigate, setAuth]);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6">
        <Alert type="error">{error}</Alert>
        <p className="mt-4 text-center">
          <a href="/login" className="text-blue-600 hover:underline">
            Request a new magic link
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Verifying your magic link...</p>
      </div>
    </div>
  );
}
```

## Frontend - Protected Route Component

```typescript
// frontend/src/shared/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

---

This template provides a complete authentication implementation with:
- Magic link generation and verification
- JWT session management
- Secure token handling
- Frontend state management
- Protected routes
- Error handling
