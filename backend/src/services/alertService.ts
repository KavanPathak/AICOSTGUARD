import prisma from '../utils/prisma';
import logger from '../utils/logger';

export const checkAndTriggerAlerts = async (appId: string, currentLatencyMs: number, wasError: boolean) => {
  try {
    const app = await prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Check Latency Threshold Alert
    if (currentLatencyMs > app.latencyThreshold) {
      // Create a latency alert
      await prisma.alert.create({
        data: {
          appId,
          type: 'latency_threshold',
          thresholdValue: app.latencyThreshold,
          actualValue: currentLatencyMs,
          message: `Request latency of ${currentLatencyMs}ms exceeded threshold of ${app.latencyThreshold}ms`,
          isResolved: false,
        },
      });
      logger.warn(`Latency alert triggered for app ${appId}: ${currentLatencyMs}ms`);
    }

    // 2. Check Daily Cost Limit Alert
    // Sum all estimated costs for today
    const costAgg = await prisma.requestLog.aggregate({
      where: {
        appId,
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        estimatedCost: true,
      },
    });

    const totalCostToday = costAgg._sum.estimatedCost || 0;
    if (totalCostToday > app.dailyCostLimit) {
      // Check if we already have an unresolved cost limit alert for today
      const existingAlert = await prisma.alert.findFirst({
        where: {
          appId,
          type: 'cost_limit',
          isResolved: false,
          createdAt: {
            gte: todayStart,
          },
        },
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            appId,
            type: 'cost_limit',
            thresholdValue: app.dailyCostLimit,
            actualValue: totalCostToday,
            message: `Daily cost of $${totalCostToday.toFixed(4)} exceeded limit of $${app.dailyCostLimit.toFixed(2)}`,
            isResolved: false,
          },
        });
        logger.warn(`Daily cost alert triggered for app ${appId}: $${totalCostToday.toFixed(4)}`);
      }
    }

    // 3. Check Error Rate Alert (over last 50 requests)
    const recentLogs = await prisma.requestLog.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { status: true },
    });

    if (recentLogs.length >= 10) {
      const errorCount = recentLogs.filter((log) => log.status < 200 || log.status >= 300).length;
      const errorRate = errorCount / recentLogs.length;

      if (errorRate > app.errorRateThreshold) {
        // Check if there is an unresolved error rate alert
        const existingAlert = await prisma.alert.findFirst({
          where: {
            appId,
            type: 'error_rate',
            isResolved: false,
          },
        });

        if (!existingAlert) {
          await prisma.alert.create({
            data: {
              appId,
              type: 'error_rate',
              thresholdValue: app.errorRateThreshold,
              actualValue: errorRate,
              message: `Error rate of ${(errorRate * 100).toFixed(1)}% (last ${recentLogs.length} reqs) exceeded threshold of ${(app.errorRateThreshold * 100).toFixed(1)}%`,
              isResolved: false,
            },
          });
          logger.warn(`Error rate alert triggered for app ${appId}: ${(errorRate * 100).toFixed(1)}%`);
        }
      }
    }
  } catch (error) {
    logger.error({ msg: 'Error running alerts check', error });
  }
};
