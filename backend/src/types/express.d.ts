import { UserRole } from '../middleware/auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        role: UserRole;
        clientId: string | undefined;
      };
    }
  }
}

export {};
