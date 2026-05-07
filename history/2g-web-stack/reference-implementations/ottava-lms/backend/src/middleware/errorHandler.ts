import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = randomUUID();
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';

  // Log error details (will be captured by Fly.io logs)
  console.error(`[${requestId}] Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: (req as any).user?.userId,
    ip: req.ip,
  });

  // Send response - hide stack traces in production
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message:
        statusCode === 500 && process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
      request_id: requestId,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
};

// Custom error class for consistent error handling
export class ApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}
