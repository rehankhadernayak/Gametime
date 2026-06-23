import { describe, expect, test } from 'vitest';
import { createPgDbAdapter, pgTransactionMiddleware } from '../src/db/pgAdapter.js';

function createTrackingPool() {
  const connections = [];
  let connectCount = 0;

  function makeClient(id) {
    const queries = [];
    return {
      id,
      queries,
      async query(text) {
        queries.push(text);
        if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') {
          return { rows: [], rowCount: 0 };
        }
        return { rows: [{ id: 'row-1' }], rowCount: 1 };
      },
      release() {
        /* no-op */
      }
    };
  }

  const pool = {
    async connect() {
      connectCount += 1;
      const client = makeClient(connectCount);
      connections.push(client);
      return client;
    },
    async query(text, params) {
      const client = makeClient('direct');
      return client.query(text, params);
    },
    connections,
    get connectCount() {
      return connectCount;
    }
  };

  return pool;
}

describe('pgAdapter transactions', () => {
  test('BEGIN and COMMIT use the same pooled client', async () => {
    const pool = createTrackingPool();
    const db = createPgDbAdapter(pool);

    await new Promise((resolve, reject) => {
      pgTransactionMiddleware({}, {}, async (err) => {
        if (err) return reject(err);
        try {
          await db.exec('BEGIN');
          await db.run('UPDATE tasks SET state = ? WHERE id = ?', ['Approved', 'task-1']);
          await db.exec('COMMIT');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    expect(pool.connectCount).toBe(1);
    const txClient = pool.connections[0];
    expect(txClient.queries).toEqual(
      expect.arrayContaining(['BEGIN', 'UPDATE tasks SET state = $1 WHERE id = $2', 'COMMIT'])
    );
  });

  test('ROLLBACK releases the transaction client', async () => {
    const pool = createTrackingPool();
    const db = createPgDbAdapter(pool);

    await new Promise((resolve, reject) => {
      pgTransactionMiddleware({}, {}, async (err) => {
        if (err) return reject(err);
        try {
          await db.exec('BEGIN');
          await db.exec('ROLLBACK');
          await db.exec('BEGIN');
          await db.exec('COMMIT');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    expect(pool.connectCount).toBe(2);
  });
});
