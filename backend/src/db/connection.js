import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { env } from '../config/env.js';

let db;

export async function getDb() {
  if (db) return db;

  const absolutePath = path.resolve(process.cwd(), env.databasePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  db = await open({
    filename: absolutePath,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');
  // Reduce SQLITE_BUSY failures when evidence submissions hit the DB concurrently.
  await db.exec('PRAGMA busy_timeout = 8000;');
  return db;
}

export async function closeDb() {
  if (!db) return;
  await db.close();
  db = null;
}
