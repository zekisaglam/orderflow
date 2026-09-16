import { Request, Response, NextFunction } from 'express';

export type UserRole = 'admin' | 'clientA' | 'clientB';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const role = req.header('x-user-role') as UserRole | undefined;
  const clientId = req.header('x-client-id');

  if (!role) {
    return res.status(401).json({ error: 'Missing x-user-role header' });
  }

  req.user = { role, clientId };
  next();
}
