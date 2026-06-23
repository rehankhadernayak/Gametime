import { AsyncLocalStorage } from 'node:async_hooks';
import pg from 'pg';

/** Per-request transaction client — keeps BEGIN/COMMIT on one pooled connection. */
const txStorage = new AsyncLocalStorage();

/**
 * Express middleware: scopes PostgreSQL transactions to the current request.
 * Required when services call `db.exec('BEGIN')` … `db.exec('COMMIT')` on Postgres.
 */
export function pgTransactionMiddleware(_req, _res, next) {
  txStorage.run({ client: null }, next);
}

/**
 * Translates sqlite-style `?` placeholders to PostgreSQL `$1`, `$2`, …
 */
function toPgSql(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

function normalizeExecCommand(sql) {
  return String(sql || '').trim().split(/\s+/)[0]?.toUpperCase() || '';
}

/**
 * Wraps a pg Pool with the async sqlite-like API used across the codebase:
 * `get`, `all`, `run`, `exec`.
 */
export function createPgDbAdapter(pool) {
  async function runQuery(sql, params = []) {
    const text = toPgSql(sql);
    const store = txStorage.getStore();
    const client = store?.client;
    if (client) {
      return client.query(text, params);
    }
    return pool.query(text, params);
  }

  return {
    async get(sql, params = []) {
      const { rows } = await runQuery(sql, params);
      return rows[0] ?? undefined;
    },

    async all(sql, params = []) {
      const { rows } = await runQuery(sql, params);
      return rows;
    },

    async run(sql, params = []) {
      const { rowCount, rows } = await runQuery(sql, params);
      const changes = rowCount ?? 0;
      let lastID = undefined;
      if (rows?.length && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], 'id')) {
        lastID = rows[0].id;
      }
      return { changes, lastID };
    },

    async exec(sql) {
      const cmd = normalizeExecCommand(sql);
      if (cmd === 'BEGIN') {
        const store = txStorage.getStore();
        if (!store) {
          throw new Error('[pg] BEGIN requires pgTransactionMiddleware on the Express app');
        }
        if (store.client) {
          throw new Error('[pg] Transaction already active on this request');
        }
        const client = await pool.connect();
        await client.query('BEGIN');
        store.client = client;
        return;
      }

      if (cmd === 'COMMIT' || cmd === 'ROLLBACK') {
        const store = txStorage.getStore();
        const client = store?.client;
        if (!client) {
          throw new Error(`[pg] ${cmd} without an active transaction`);
        }
        try {
          await client.query(cmd);
        } finally {
          client.release();
          store.client = null;
        }
        return;
      }

      await runQuery(sql);
    },

    /** Underlying pool for advanced use (e.g. getClient for long transactions). */
    _pool: pool
  };
}

export function createPgPool(connectionString) {
  return new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 10000)
  });
}
