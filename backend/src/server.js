import { createApp } from './app.js';
import { env } from './config/env.js';
import { initDb } from './db/init.js';
import { startTaskExpirationJob } from './jobs/taskExpirationJob.js';
import { startWeeklyDigestJob } from './jobs/weeklyDigestJob.js';
import { logger } from './utils/logger.js';

async function start() {
  await initDb();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`Gametime API running on http://localhost:${env.port}`);
  });
  startTaskExpirationJob();
  startWeeklyDigestJob();
}

start().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
