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

function isDevTunnelOrigin(origin) {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return (
      h.endsWith('.trycloudflare.com') ||
      h.endsWith('.cfargotunnel.com') ||
      h.endsWith('.cvm.dev')
    );
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([
    ...env.frontendOrigins,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081'
  ]);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        if (isDevTunnelOrigin(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true
    })
  );
  app.post('/giftcards/webhook', express.raw({ type: 'application/json', limit: '2mb' }), athenaWebhookRawController);
  // Stripe webhook - raw body required for signature verification (must be before express.json)
  app.post('/stripe/webhook', express.raw({ type: 'application/json', limit: '2mb' }), stripeWebhookController);
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
