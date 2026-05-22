import { Response, NextFunction } from 'express';
import axios from 'axios';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { checkAndTriggerAlerts } from '../services/alertService';

// Cost calculation rates:
// gpt-4o: Input $2.5 / 1M tokens, Output $10.0 / 1M tokens
// gpt-4o-mini: Input $0.15 / 1M tokens, Output $0.60 / 1M tokens
const calculateEstimatedCost = (model: string, promptTokens: number, completionTokens: number): number => {
  const normalizedModel = model.toLowerCase();
  let inputRate = 0; // Cost per 1 token
  let outputRate = 0; // Cost per 1 token

  if (normalizedModel.includes('gpt-4o-mini')) {
    inputRate = 0.15 / 1_000_000;
    outputRate = 0.60 / 1_000_000;
  } else if (normalizedModel.includes('gpt-4o')) {
    inputRate = 2.50 / 1_000_000;
    outputRate = 10.00 / 1_000_000;
  } else {
    // Default fallback rates (e.g. gpt-4 rates or sensible average)
    inputRate = 1.50 / 1_000_000;
    outputRate = 6.00 / 1_000_000;
  }

  return (promptTokens * inputRate) + (completionTokens * outputRate);
};

export const proxyChat = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const appId = req.apiKeyApp?.id;
  if (!appId) {
    return next(new AppError('Unauthorized proxy access', 401));
  }

  const openaiApiKey = (req.headers['x-openai-api-key'] as string) || process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    return next(
      new AppError(
        'OpenAI API Key is missing. Provide X-OpenAI-API-Key header or set OPENAI_API_KEY on the server.',
        400
      )
    );
  }

  const requestBody = req.body;
  const model = requestBody.model || 'gpt-4o-mini';

  const startTime = process.hrtime();

  try {
    logger.info({ msg: 'Forwarding request to OpenAI', appId, model });

    // Call OpenAI endpoint
    const openAiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        timeout: 60000, // 60s timeout
      }
    );

    // Calculate latency
    const diff = process.hrtime(startTime);
    const latencyMs = Math.round(diff[0] * 1000 + diff[1] / 1000000);

    // Extract usage details
    const usage = openAiResponse.data.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };

    const promptTokens = usage.prompt_tokens;
    const completionTokens = usage.completion_tokens;
    const totalTokens = usage.total_tokens;

    const estimatedCost = calculateEstimatedCost(model, promptTokens, completionTokens);

    // Store log in database
    await prisma.requestLog.create({
      data: {
        appId,
        model,
        provider: 'openai',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        status: openAiResponse.status,
      },
    });

    // Asynchronously verify metrics against thresholds and trigger alerts if needed
    checkAndTriggerAlerts(appId, latencyMs, false);

    // Return exact OpenAI response payload
    return res.status(openAiResponse.status).json(openAiResponse.data);

  } catch (error: any) {
    const diff = process.hrtime(startTime);
    const latencyMs = Math.round(diff[0] * 1000 + diff[1] / 1000000);

    let errorStatus = 500;
    let errorMessage = 'Failed to forward request to OpenAI';

    if (axios.isAxiosError(error) && error.response) {
      errorStatus = error.response.status;
      errorMessage = JSON.stringify(error.response.data) || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    logger.error({ msg: 'OpenAI proxy request failed', appId, model, errorStatus, errorMessage });

    // Store failed request log
    await prisma.requestLog.create({
      data: {
        appId,
        model,
        provider: 'openai',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs,
        status: errorStatus,
        errorMessage: errorMessage.substring(0, 1000), // Avoid massive error storage
      },
    });

    // Alert check (marking error as true)
    checkAndTriggerAlerts(appId, latencyMs, true);

    return res.status(errorStatus).json({
      success: false,
      error: 'Proxy Error',
      message: errorMessage,
    });
  }
};
