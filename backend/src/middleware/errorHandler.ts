import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  res.locals.error = err.message;
  res.locals.stack = err.stack;
  res.status(500).json({ error: 'Internal Server Error' });
}
