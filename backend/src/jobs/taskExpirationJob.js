import { expireTasks } from '../services/taskService.js';
import { logger } from '../utils/logger.js';

let timer = null;

export function startTaskExpirationJob() {
  if (timer) return;
  timer = setInterval(() => {
    expireTasks().catch((error) => {
      logger.error({ err: error }, 'Task expiration job failed');
    });
  }, 60_000);
}

export function stopTaskExpirationJob() {
  if (timer) clearInterval(timer);
  timer = null;
}
