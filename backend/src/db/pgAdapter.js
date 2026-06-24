import pg from 'pg';

/**
 * Translates sqlite-style `?` placeholders to PostgreSQL `$1`, `$2`, …
 */
function toPgSql(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/**
 * @param {(text: string, params?: unknown[]) => Promise<import('pg').QueryResult>} queryAsync
 */
function createDbQueryInterface(queryAsync) {
  return {
    async get(sql, params = []) {
      const text = toPgSql(sql);
      const { rows } = await queryAsync(text, params);
      return rows[0] ?? undefined;
    },

    async all(sql, params = []) {
      const text = toPgSql(sql);
      const { rows } = await queryAsync(text, params);
      return rows;
    },

    async run(sql, params = []) {
      const text = toPgSql(sql);
      const { rowCount, rows } = await queryAsync(text, params);
      const changes = rowCount ?? 0;
      let lastID = undefined;
      if (rows?.length && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], 'id')) {
        lastID = rows[0].id;
      }
      return { changes, lastID };
    },

    async exec(sql) {
      await queryAsync(sql, []);
    }
  };
}

/**
 * Wraps a pg Pool with the async sqlite-like API used across the codebase:
 * `get`, `all`, `run`, `exec`, plus `withTransaction` for atomic multi-statement work.
 */
export function createPgDbAdapter(pool) {
  const base = createDbQueryInterface((text, params) => pool.query(text, params));

  return {
    ...base,

    async withTransaction(callback) {
      const client = await pool.connect();
      const tx = createDbQueryInterface((text, params) => client.query(text, params));
      try {
        await client.query('BEGIN');
        const result = await callback(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // ignore
        }
        throw error;
      } finally {
        client.release();
      }
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
