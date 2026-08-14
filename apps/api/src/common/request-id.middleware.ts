import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(
  req: Request & { id?: string },
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers['x-request-id'];
  const reqId = typeof header === 'string' && header.trim() ? header.trim() : randomUUID();
  req.id = reqId;
  res.setHeader('x-request-id', reqId);
  next();
}
