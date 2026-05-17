import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import childrenRoutes from './routes/childrenRoutes.js';
import tasksRoutes from './routes/tasksRoutes.js';
import pointsRoutes from './routes/pointsRoutes.js';
import rewardsRoutes from './routes/rewardsRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import gamingRoutes from './routes/gamingRoutes.js';
import giftcardsRoutes from './routes/giftcardsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import achievementsRoutes from './routes/achievementsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { athenaWebhookRawController } from './controllers/giftcardsController.js';
import { stripeWebhookController } from './controllers/stripeController.js';
import stripeRouter from './routes/stripeRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getDb } from './db/connection.js';
import { logger } from './utils/logger.js';
import { env } from './config/env.js';
import { createStrictCorsOriginValidator } from './utils/productionCorsOrigin.js';

export function createApp() {
  const app = express();

  const corsShared = {
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
    maxAge: 86400
  };

  // Reflect request Origin when safe for local dev (including Codespaces) or when
  // CORS_REFLECT_ORIGIN=true for ad-hoc testing. Production otherwise uses an allowlist
  // plus GitHub preview hosts and optional Vercel *.vercel.app wildcard.
  const useReflectCorsOrigin =
    process.env.NODE_ENV !== 'production' || env.corsReflectOrigin === true;

  const strictOriginAllows = createStrictCorsOriginValidator(env.frontendOrigins);

  const corsMiddleware = useReflectCorsOrigin
    ? cors({
        ...corsShared,
        origin: true
      })
    : cors({
        ...corsShared,
        origin(origin, callback) {
          if (strictOriginAllows(origin)) return callback(null, true);
          // Deny without throwing — avoids a 500 while still omitting Access-Control-Allow-Origin.
          logger.warn({ origin }, 'CORS request blocked for origin');
          return callback(null, false);
        }
      });

  app.use(helmet());
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);
  app.post('/giftcards/webhook', express.raw({ type: 'application/json', limit: '2mb' }), athenaWebhookRawController);
  // Stripe webhook - raw body required for signature verification (must be before express.json)
  app.post('/stripe/webhook', express.raw({ type: 'application/json', limit: '2mb' }), stripeWebhookController);
  // Production alias (Railway / Stripe Dashboard): same handler as /stripe/webhook
  app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '2mb' }), stripeWebhookController);
  // Body limit is set to 14 MB: accommodates a 10 MB base64 evidence payload
  // (~13.3 MB on the wire) plus JSON envelope overhead, with a small buffer.
  app.use(express.json({ limit: '14mb' }));
  app.use(cookieParser());
  // Structured request logging - skips /health polling so logs stay clean
  app.use(pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/health' }
  }));

  // Health check - verifies DB connectivity so hosting platforms can detect failures
  app.get('/health', async (_req, res) => {
    try {
      const db = await getDb();
      await db.get('SELECT 1');
      res.json({ ok: true, db: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
      logger.error({ err }, 'Health check DB ping failed');
      res.status(503).json({ ok: false, db: 'error', error: err.message, timestamp: new Date().toISOString() });
    }
  });

  app.use('/auth', authRoutes);
  app.use('/children', childrenRoutes);
  app.use('/tasks', tasksRoutes);
  app.use('/points', pointsRoutes);
  app.use('/rewards', rewardsRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/gaming', gamingRoutes);
  app.use('/giftcards', giftcardsRoutes);
  app.use('/ai', aiRoutes);
  app.use('/achievements', achievementsRoutes);
  app.use('/admin', adminRoutes);
  app.use('/stripe', stripeRouter);
  app.use('/billing', billingRoutes);
  app.use('/api/billing', billingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
