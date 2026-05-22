import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

export const getAlertsByApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    const isResolvedQuery = req.query.isResolved as string;

    if (!userId) return next(new AppError('Unauthorized', 401));

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    const whereClause: any = { appId };
    if (isResolvedQuery === 'true') {
      whereClause.isResolved = true;
    } else if (isResolvedQuery === 'false') {
      whereClause.isResolved = false;
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, alerts });
  } catch (error) {
    return next(error);
  }
};

export const resolveAlert = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { alertId } = req.params;

    if (!userId) return next(new AppError('Unauthorized', 401));

    // Find the alert and ensure it belongs to an app owned by the user
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        app: {
          userId,
        },
      },
    });

    if (!alert) {
      return next(new AppError('Alert not found or unauthorized', 404));
    }

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: { isResolved: true },
    });

    return res.status(200).json({
      success: true,
      alert: updatedAlert,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    return next(error);
  }
};
