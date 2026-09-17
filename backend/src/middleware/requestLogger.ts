import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    res.locals.responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const isError = res.statusCode >= 400;

    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      method: req.method,
      route: req.originalUrl,
      statusCode: res.statusCode,
      role: req.user?.role ?? null,
      clientId: req.user?.clientId ?? null,
    };

    if (isError) {
      logEntry.error = res.locals.error ?? res.locals.responseBody?.error ?? null;
      if (res.locals.stack) {
        logEntry.stack = res.locals.stack;
      }
    }

    if (isError) {
      logger.error('request', logEntry);
    } else {
      logger.info('request', logEntry);
    }
  });

  next();
}
