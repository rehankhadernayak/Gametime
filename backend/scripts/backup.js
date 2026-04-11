#!/usr/bin/env node
/**
 * Gametime DB Backup Script
 * ─────────────────────────
 * Uses SQLite's online backup API — safe to run while the server is live.
 * Writes a dated snapshot to ./data/backups/ and prunes copies older than
 * BACKUP_RETAIN_DAYS (default 14).
 *
 * Usage:
 *   node scripts/backup.js
 *
 * Environment variables:
 *   DATABASE_PATH        Path to the live database  (default: ./data/gametime.db)
 *   BACKUP_DIR           Backup destination folder  (default: ./data/backups)
 *   BACKUP_RETAIN_DAYS   Days to keep old backups   (default: 14)
 *
 * Cron example (daily at 02:00):
 *   0 2 * * * cd /path/to/gametime/backend && node scripts/backup.js >> /var/log/gametime-backup.log 2>&1
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open }   from 'sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────

const DB_PATH      = process.env.DATABASE_PATH   || path.resolve(__dirname, '../data/gametime.db');
const BACKUP_DIR   = process.env.BACKUP_DIR      || path.resolve(__dirname, '../data/backups');
const RETAIN_DAYS  = Number(process.env.BACKUP_RETAIN_DAYS ?? 14);

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(`[backup] ${new Date().toISOString()}  ${msg}\n`);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Ensure source DB exists
  if (!fs.existsSync(DB_PATH)) {
    log(`ERROR: source database not found at ${DB_PATH}`);
    process.exit(1);
  }

  // 2. Ensure backup directory exists
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const destPath = path.join(BACKUP_DIR, `gametime-${stamp()}.db`);

  // 3. Open source DB and run online backup
  log(`Starting backup: ${DB_PATH} → ${destPath}`);
  const src = await open({ filename: DB_PATH, driver: sqlite3.Database, mode: sqlite3.OPEN_READONLY });

  await new Promise((resolve, reject) => {
    // sqlite3's built-in backup() performs an online, hot backup.
    src.driver.backup(destPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  await src.close();
  const { size } = fs.statSync(destPath);
  log(`Backup complete — ${(size / 1024 / 1024).toFixed(2)} MB written to ${destPath}`);

  // 4. Prune old backups
  if (RETAIN_DAYS > 0) {
    const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
    const entries = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('gametime-') && f.endsWith('.db'));
    let pruned = 0;
    for (const entry of entries) {
      const full = path.join(BACKUP_DIR, entry);
      if (full === destPath) continue; // never delete the one we just made
      const { mtimeMs } = fs.statSync(full);
      if (mtimeMs < cutoff) {
        fs.unlinkSync(full);
        pruned++;
      }
    }
    if (pruned) log(`Pruned ${pruned} backup(s) older than ${RETAIN_DAYS} days`);
  }
}

main().catch((err) => {
  process.stderr.write(`[backup] FATAL: ${err.message}\n`);
  process.exit(1);
});
