import morgan from 'morgan';
import { Request } from 'express';

// Custom token for user ID (extracted from JWT)
morgan.token('user-id', (req: Request) => {
  return (req as any).user?.userId || 'anon';
});

// Format: timestamp method url status response-time user-id
export const requestLogger = morgan(
  ':date[iso] :method :url :status :response-time ms - :user-id',
  {
    skip: (req) => req.url === '/health' || (req.url?.startsWith('/health') ?? false),
  }
);
