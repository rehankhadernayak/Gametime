import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { createPgDbAdapter, createPgPool } from './pgAdapter.js';

/** Nested `withTransaction` on SQLite reuses the outer BEGIN without starting a new transaction. */
const sqliteTxNest = new AsyncLocalStorage();

function attachSqliteWithTransaction(db) {
  if (typeof db.withTransaction === 'function') return;
  db.withTransaction = async function withTransaction(work) {
    if (sqliteTxNest.getStore()) {
      return await work(this);
    }
    return await sqliteTxNest.run(true, async () => {
      await this.exec('BEGIN');
      try {
        const result = await work(this);
        await this.exec('COMMIT');
        return result;
      } catch (e) {
        await this.exec('ROLLBACK');
        throw e;
      }
    });
  };
}

let sqliteDb;
let pgPool;
let pgAdapter;
let supabaseAdmin;

function useSqlite() {
  if (env.useSqliteFallback) return true;
  if (env.databaseUrl) return false;
  // Local dev / tests without a Postgres URL keep using the file DB.
  if (process.env.NODE_ENV === 'production') return false;
  return true;
}

/**
 * Primary database handle: PostgreSQL adapter (same `get`/`all`/`run`/`exec` as sqlite wrapper)
 * when `DATABASE_URL` or `SUPABASE_DATABASE_URL` is set, else legacy SQLite for local-only dev.
 */
export async function getDb() {
  if (useSqlite()) {
    if (!sqliteDb) {
      const absolutePath = path.resolve(process.cwd(), env.databasePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      sqliteDb = await open({
        filename: absolutePath,
        driver: sqlite3.Database
      });
      await sqliteDb.exec('PRAGMA foreign_keys = ON;');
      await sqliteDb.exec('PRAGMA busy_timeout = 8000;');
      attachSqliteWithTransaction(sqliteDb);
    }
    return sqliteDb;
  }

  if (!pgAdapter) {
    const conn = env.databaseUrl;
    if (!conn) {
      throw new Error(
        '[db] Set DATABASE_URL or SUPABASE_DATABASE_URL (PostgreSQL connection string). ' +
          'For local SQLite-only dev, set USE_SQLITE_FALLBACK=true and DATABASE_PATH.'
      );
    }
    pgPool = createPgPool(conn);
    pgAdapter = createPgDbAdapter(pgPool);
  }
  return pgAdapter;
}

/**
 * Supabase JS client (service role) for Storage, Auth admin, or `.from()` queries when preferred.
 * Only available when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
 */
export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('[db] getSupabaseAdmin() requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return supabaseAdmin;
}

export function tryGetSupabaseAdmin() {
  try {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
    return getSupabaseAdmin();
  } catch {
    return null;
  }
}

export async function closeDb() {
  if (sqliteDb) {
    await sqliteDb.close();
    sqliteDb = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    pgAdapter = null;
  }
  supabaseAdmin = null;
}
