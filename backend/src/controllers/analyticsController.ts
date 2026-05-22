import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';

// Helper to calculate start date based on timeRange
const getStartDateFromRange = (range: string): Date => {
  const now = new Date();
  switch (range) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '7d':
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
};

export const getOverviewStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    const timeRange = (req.query.timeRange as string) || '7d';

    if (!userId) return next(new AppError('Unauthorized', 401));

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    const startDate = getStartDateFromRange(timeRange);

    // Get logs in scope
    const logs = await prisma.requestLog.findMany({
      where: {
        appId,
        createdAt: { gte: startDate },
      },
      select: {
        estimatedCost: true,
        latencyMs: true,
        status: true,
      },
    });

    const totalRequests = logs.length;
    const totalCost = logs.reduce((sum, log) => sum + log.estimatedCost, 0);
    
    const avgLatency = totalRequests > 0 
      ? Math.round(logs.reduce((sum, log) => sum + log.latencyMs, 0) / totalRequests)
      : 0;

    const errorCount = logs.filter(
      (log) => log.status < 200 || log.status >= 300
    ).length;
    
    const errorRate = totalRequests > 0 
      ? errorCount / totalRequests 
      : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalRequests,
        totalCost,
        avgLatency,
        errorRate,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getChartsData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    const timeRange = (req.query.timeRange as string) || '7d';

    if (!userId) return next(new AppError('Unauthorized', 401));

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    const startDate = getStartDateFromRange(timeRange);

    const logs = await prisma.requestLog.findMany({
      where: {
        appId,
        createdAt: { gte: startDate },
      },
      select: {
        model: true,
        estimatedCost: true,
        latencyMs: true,
        status: true,
        createdAt: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 1. Group logs by day/hour for time-series charts
    // If range is 24h, group by hour. Else group by day (YYYY-MM-DD)
    const is24h = timeRange === '24h';
    const timeSeriesMap: Record<
      string,
      {
        dateStr: string;
        cost: number;
        requests: number;
        errorCount: number;
        latencySum: number;
        promptTokensSum: number;
        completionTokensSum: number;
        totalTokensSum: number;
      }
    > = {};

    logs.forEach((log) => {
      let key = '';
      if (is24h) {
        // Group by hour e.g. "14:00"
        const hours = log.createdAt.getHours();
        key = `${hours.toString().padStart(2, '0')}:00`;
      } else {
        // Group by day e.g. "May 22" or "2026-05-22"
        key = log.createdAt.toISOString().split('T')[0];
      }

      if (!timeSeriesMap[key]) {
        timeSeriesMap[key] = {
          dateStr: key,
          cost: 0,
          requests: 0,
          errorCount: 0,
          latencySum: 0,
          promptTokensSum: 0,
          completionTokensSum: 0,
          totalTokensSum: 0,
        };
      }

      const entry = timeSeriesMap[key];
      entry.cost += log.estimatedCost;
      entry.requests += 1;
      entry.latencySum += log.latencyMs;
      entry.promptTokensSum += log.promptTokens;
      entry.completionTokensSum += log.completionTokens;
      entry.totalTokensSum += log.totalTokens;
      if (log.status < 200 || log.status >= 300) {
        entry.errorCount += 1;
      }
    });

    const timeSeriesData = Object.values(timeSeriesMap).map((entry) => ({
      date: entry.dateStr,
      cost: Number(entry.cost.toFixed(6)),
      requests: entry.requests,
      avgLatency: entry.requests > 0 ? Math.round(entry.latencySum / entry.requests) : 0,
      errorRate: entry.requests > 0 ? Number((entry.errorCount / entry.requests).toFixed(2)) : 0,
      promptTokens: entry.promptTokensSum,
      completionTokens: entry.completionTokensSum,
      totalTokens: entry.totalTokensSum,
      errorCount: entry.errorCount,
    }));

    // 2. Model usage chart (Pie chart data)
    const modelMap: Record<string, { name: string; value: number; cost: number }> = {};
    logs.forEach((log) => {
      const modelName = log.model;
      if (!modelMap[modelName]) {
        modelMap[modelName] = { name: modelName, value: 0, cost: 0 };
      }
      modelMap[modelName].value += 1;
      modelMap[modelName].cost += log.estimatedCost;
    });

    const modelUsageData = Object.values(modelMap).map((item) => ({
      name: item.name,
      value: item.value,
      cost: Number(item.cost.toFixed(6)),
    }));

    return res.status(200).json({
      success: true,
      charts: {
        timeSeries: timeSeriesData,
        modelUsage: modelUsageData,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getRequestLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { appId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const model = req.query.model as string;
    const status = req.query.status as string; // 'success' or 'error'
    const search = req.query.search as string; // search in error message/model

    if (!userId) return next(new AppError('Unauthorized', 401));

    // Verify app ownership
    const app = await prisma.app.findFirst({
      where: { id: appId, userId },
    });

    if (!app) {
      return next(new AppError('App not found or unauthorized', 404));
    }

    // Build filter clause
    const whereClause: any = { appId };

    if (model) {
      whereClause.model = {
        contains: model,
        mode: 'insensitive',
      };
    }

    if (status) {
      if (status === 'success') {
        whereClause.status = {
          gte: 200,
          lt: 300,
        };
      } else if (status === 'error') {
        whereClause.status = {
          not: {
            gte: 200,
            lt: 300,
          },
        };
      }
    }

    if (search) {
      whereClause.OR = [
        {
          model: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          errorMessage: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const total = await prisma.requestLog.count({ where: whereClause });
    const logs = await prisma.requestLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};
