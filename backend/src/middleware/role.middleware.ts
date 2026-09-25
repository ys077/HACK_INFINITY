import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log('requireRole 401: no req.user');
      res.status(401).json({ success: false, message: 'Unauthorized: User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`requireRole 403: user role '${req.user.role}' not in allowedRoles [${allowedRoles.join(', ')}]`);
      res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};
