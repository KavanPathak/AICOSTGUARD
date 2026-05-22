import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../utils/prisma';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  apiKeyApp?: {
    id: string;
    name: string;
    userId: string;
    dailyCostLimit: number;
    latencyThreshold: number;
    errorRateThreshold: number;
  };
}

// 1. JWT Authentication Middleware (for Frontend Dashboard APIs)
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided. Unauthorized.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string };
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    return next();
  } catch (error) {
    return next(new AppError('Invalid or expired token. Unauthorized.', 401));
  }
};

// Helper function to hash API Key (SHA-256)
export const hashApiKey = (key: string): string => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// 2. API Key Middleware (for Proxy API endpoints: POST /api/proxy/chat)
export const requireApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No API key provided. Use Bearer token.', 401));
  }

  const rawKey = authHeader.split(' ')[1];
  const hashedKey = hashApiKey(rawKey);

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: {
        keyHash: hashedKey,
      },
      include: {
        app: true,
      },
    });

    if (!apiKey || !apiKey.isActive) {
      return next(new AppError('Invalid or revoked API key.', 401));
    }

    req.apiKeyApp = {
      id: apiKey.app.id,
      name: apiKey.app.name,
      userId: apiKey.app.userId,
      dailyCostLimit: apiKey.app.dailyCostLimit,
      latencyThreshold: apiKey.app.latencyThreshold,
      errorRateThreshold: apiKey.app.errorRateThreshold,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
