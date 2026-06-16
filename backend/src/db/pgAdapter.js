import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * When `withTransaction` runs `work()`, all `get`/`all`/`run`/`exec` calls on this adapter
 * must use the same leased pool client so BEGIN/COMMIT form a real transaction.
 */
const pgTxLease = new AsyncLocalStorage();

/**
 * Translates sqlite-style `?` placeholders to PostgreSQL `$1`, `$2`, …
 */
function toPgSql(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/**
 * Wraps a pg Pool with the async sqlite-like API used across the codebase:
 * `get`, `all`, `run`, `exec`, and `withTransaction`.
 */
export function createPgDbAdapter(pool) {
  const query = async (text, params = []) => {
    const lease = pgTxLease.getStore();
    if (lease?.client) {
      return lease.client.query(text, params);
    }
    return pool.query(text, params);
  };

  const adapter = {
    async get(sql, params = []) {
      const text = toPgSql(sql);
      const { rows } = await query(text, params);
      return rows[0] ?? undefined;
    },

    async all(sql, params = []) {
      const text = toPgSql(sql);
      const { rows } = await query(text, params);
      return rows;
    },

    async run(sql, params = []) {
      const text = toPgSql(sql);
      const { rowCount, rows } = await query(text, params);
      const changes = rowCount ?? 0;
      let lastID = undefined;
      if (rows?.length && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], 'id')) {
        lastID = rows[0].id;
      }
      return { changes, lastID };
    },

    async exec(sql) {
      await query(String(sql), []);
    },

    /** Underlying pool for advanced use (e.g. getClient for long transactions). */
    _pool: pool,

    /**
     * Runs `work` with a single connection: BEGIN → work(adapter) → COMMIT, or ROLLBACK on error.
     * Nested calls reuse the outer transaction (no nested BEGIN).
     */
    async withTransaction(work) {
      if (pgTxLease.getStore()?.client) {
        return await work(adapter);
      }

      const client = await pool.connect();
      return await pgTxLease.run({ client }, async () => {
        try {
          await client.query('BEGIN');
          const result = await work(adapter);
          await client.query('COMMIT');
          return result;
        } catch (error) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // ignore secondary failures
          }
          throw error;
        } finally {
          client.release();
        }
      });
    }
  };

  return adapter;
}

export function createPgPool(connectionString) {
  return new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 10000)
  });
}
