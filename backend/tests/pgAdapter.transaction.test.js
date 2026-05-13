import { describe, expect, test, vi } from 'vitest';
import { createPgDbAdapter } from '../src/db/pgAdapter.js';

describe('createPgDbAdapter.withTransaction', () => {
  test('pins a single client for BEGIN, statements, COMMIT, and release', async () => {
    const queries = [];
    const client = {
      async query(text, params) {
        queries.push({ conn: 'client', text: String(text).slice(0, 80), hasParams: params != null && params.length > 0 });
        return { rows: [], rowCount: 0 };
      },
      release: vi.fn(() => {
        queries.push({ conn: 'client', text: 'release' });
      })
    };
    const pool = {
      query: vi.fn(async () => {
        queries.push({ conn: 'pool' });
        return { rows: [], rowCount: 0 };
      }),
      connect: vi.fn(async () => client)
    };

    const db = createPgDbAdapter(pool);
    await db.withTransaction(async (tx) => {
      await tx.run('UPDATE parent_accounts SET gp_balance = ? WHERE id = ?', [5, 'abc']);
    });

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);

    const clientQueries = queries.filter((q) => q.conn === 'client');
    expect(clientQueries[0].text).toBe('BEGIN');
    expect(clientQueries.some((q) => q.text.startsWith('UPDATE'))).toBe(true);
    expect(clientQueries.some((q) => q.text === 'COMMIT')).toBe(true);
    expect(clientQueries[clientQueries.length - 1].text).toBe('release');
  });
});
