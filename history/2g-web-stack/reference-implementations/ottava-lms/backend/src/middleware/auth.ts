import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

const rawDemoMode = process.env.DEMO_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';
if (rawDemoMode && isProduction) {
  console.warn('⚠️  WARNING: DEMO_MODE is enabled in production! Authentication is bypassed.');
}
const demoModeActive = rawDemoMode; // Allow demo mode in production for MVP
export const demoModeEnabled = () => demoModeActive;

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Demo mode - bypass authentication for enterprise customization (default on)
    if (demoModeEnabled()) {
      req.user = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'demo@melodylms.com',
        role: 'admin',
        organizationId: '00000000-0000-0000-0000-000000000001'
      };
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (demoModeEnabled()) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
