import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Singleton Pino logger.
 *
 * - Development : pretty-printed, colourised, debug level
 * - Production  : NDJSON to stdout, info level (aggregated by hosting platform)
 *
 * Override the level at runtime via LOG_LEVEL env var (trace/debug/info/warn/error/fatal).
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    base: null // omit pid + hostname — noisy in containerised deployments
  },
  isDev
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname'
        }
      })
    : undefined
);
