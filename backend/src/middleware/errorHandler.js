import { ZodError } from 'zod';
import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err instanceof SyntaxError && err?.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  if (typeof err?.message === 'string' && err.message.startsWith('CORS blocked for origin:')) {
    return res.status(403).json({ error: err.message });
  }

  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
}
