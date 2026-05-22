import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest, hashApiKey } from '../middleware/auth';

export const generateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.body;

    if (!userId) return next(new AppError('Unauthorized', 401));
    if (!appId) return next(new AppError('appId is required', 400));

    // Verify app exists and belongs to the user
    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    // Generate secure random key: acg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `acg_live_${randomHex}`;
    const keyPrefix = `acg_live_${randomHex.substring(0, 6)}...`;
    
    // Hash key with SHA-256
    const keyHash = hashApiKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        appId,
        keyHash,
        keyPrefix,
        isActive: true,
      },
    });

    // Return rawKey ONLY ONCE on generation
    return res.status(201).json({
      success: true,
      apiKey: {
        id: apiKey.id,
        appId: apiKey.appId,
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
      },
      rawKey, // User must save this immediately
    });
  } catch (error) {
    return next(error);
  }
};

export const getApiKeysByApp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;

    if (!userId) return next(new AppError('Unauthorized', 401));
    if (!appId) return next(new AppError('appId is required', 400));

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(200).json({ success: true, apiKeys });
  } catch (error) {
    return next(error);
  }
};

export const revokeApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { keyId } = req.params;

    if (!userId) return next(new AppError('Unauthorized', 401));

    // Find the key and ensure it belongs to an app owned by this user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        app: {
          userId,
        },
      },
    });

    if (!apiKey) {
      return next(new AppError('API key not found or unauthorized', 404));
    }

    // Revoke the key by deleting it, or marking isActive = false. Let's delete it so it's fully revoked.
    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return res.status(200).json({
      success: true,
      message: 'API Key revoked successfully',
    });
  } catch (error) {
    return next(error);
  }
};
