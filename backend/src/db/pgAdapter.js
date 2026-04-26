import pg from 'pg';

/**
 * Translates sqlite-style `?` placeholders to PostgreSQL `$1`, `$2`, …
 */
function toPgSql(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/**
 * Wraps a pg Pool with the async sqlite-like API used across the codebase:
 * `get`, `all`, `run`, `exec`.
 */
export function createPgDbAdapter(pool) {
  return {
    async get(sql, params = []) {
      const text = toPgSql(sql);
      const { rows } = await pool.query(text, params);
      return rows[0] ?? undefined;
    },

    async all(sql, params = []) {
      const text = toPgSql(sql);
      const { rows } = await pool.query(text, params);
      return rows;
    },

    async run(sql, params = []) {
      const text = toPgSql(sql);
      const { rowCount, rows } = await pool.query(text, params);
      const changes = rowCount ?? 0;
      let lastID = undefined;
      if (rows?.length && rows[0] && Object.prototype.hasOwnProperty.call(rows[0], 'id')) {
        lastID = rows[0].id;
      }
      return { changes, lastID };
    },

    async exec(sql) {
      await pool.query(sql);
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
