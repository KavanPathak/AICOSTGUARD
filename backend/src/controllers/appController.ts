import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

const appSchema = z.object({
  name: z.string().min(1, 'App name is required'),
  description: z.string().optional(),
  dailyCostLimit: z.number().nonnegative('Daily cost limit must be 0 or greater').optional(),
  latencyThreshold: z.number().int().nonnegative('Latency threshold must be 0 or greater').optional(),
  errorRateThreshold: z.number().min(0).max(1, 'Error rate threshold must be between 0 and 1').optional(),
});

export const getApps = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const apps = await prisma.app.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, apps });
  } catch (error) {
    return next(error);
  }
};

export const getAppById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    return res.status(200).json({ success: true, app });
  } catch (error) {
    return next(error);
  }
};

export const createApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const data = appSchema.parse(req.body);

    const newApp = await prisma.app.create({
      data: {
        name: data.name,
        description: data.description,
        dailyCostLimit: data.dailyCostLimit ?? 5.0,
        latencyThreshold: data.latencyThreshold ?? 3000,
        errorRateThreshold: data.errorRateThreshold ?? 0.15,
        userId,
      },
    });

    return res.status(201).json({ success: true, app: newApp });
  } catch (error) {
    return next(error);
  }
};

export const updateApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const data = appSchema.partial().parse(req.body);

    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    const updatedApp = await prisma.app.update({
      where: { id: appId },
      data,
    });

    return res.status(200).json({ success: true, app: updatedApp });
  } catch (error) {
    return next(error);
  }
};

export const deleteApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    if (!userId) return next(new AppError('Unauthorized', 401));

    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    await prisma.app.delete({
      where: { id: appId },
    });

    return res.status(200).json({ success: true, message: 'App deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
