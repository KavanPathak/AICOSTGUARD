import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create the User and a default App inside a transaction so it's atomic
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          password: passwordHash,
          name: data.name,
        },
      });

      const defaultApp = await tx.app.create({
        data: {
          name: 'My First App',
          description: 'Default application generated automatically on registration.',
          dailyCostLimit: 5.0, // default limit
          latencyThreshold: 3000, // default latency limit in ms
          errorRateThreshold: 0.15, // default error limit (15%)
          userId: newUser.id,
        },
      });

      return { user: newUser, app: defaultApp };
    });

    const token = jwt.sign(
      { id: result.user.id, email: result.user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      app: {
        id: result.app.id,
        name: result.app.name,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    // Fetch the user's apps
    const userApps = await prisma.app.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      apps: userApps.map((a) => ({ id: a.id, name: a.name })),
    });
  } catch (error) {
    return next(error);
  }
};

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError('Unauthorized access', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(error);
  }
};
