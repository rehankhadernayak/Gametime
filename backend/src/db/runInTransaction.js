/**
 * Runs `fn(db)` inside one database transaction.
 * PostgreSQL pool adapter implements `withTransaction` using a single pooled client
 * so BEGIN/COMMIT cannot land on different connections (which breaks atomicity).
 * SQLite uses BEGIN/COMMIT on the shared file connection.
 */
export async function runInDbTransaction(db, fn) {
  if (typeof db.withTransaction === 'function') {
    return db.withTransaction(fn);
  }
  await db.exec('BEGIN');
  try {
    const result = await fn(db);
    await db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      await db.exec('ROLLBACK');
    } catch {
      // ignore rollback failures
    }
    throw error;
  }
}
