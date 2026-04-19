/**
 * Evidence File Storage Service
 *
 * Saves task evidence (photos / videos) to the local file system instead of
 * storing raw base64 inside SQLite.  This keeps the database lean and allows
 * evidence to be served through an authenticated HTTP endpoint.
 *
 * Storage layout (relative to the database directory):
 *   <data_dir>/evidence/<completionId>.<ext>
 *
 * The value persisted in task_completions.evidence_data is the relative path,
 * e.g.  "evidence/abc123.jpg".  Legacy rows that still contain a data-URL are
 * identified by isLegacyDataUrl() and handled transparently by the serve
 * endpoint - no migration required.
 */

import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { existsSync }                          from 'fs';
import path                                    from 'path';
import { env }                                 from '../config/env.js';

/* ── Directory resolution ───────────────────────────────────────────── */
// Anchor to the same directory that holds the SQLite database so both
// files always stay together regardless of the working directory.
const DATA_DIR     = path.dirname(path.resolve(env.databasePath));
const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence');

export async function ensureEvidenceDir() {
  if (!existsSync(EVIDENCE_DIR)) {
    await mkdir(EVIDENCE_DIR, { recursive: true });
  }
}

/* ── Internal helpers ───────────────────────────────────────────────── */
function mimeToExt(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png'))  return 'png';
  if (m.includes('gif'))  return 'gif';
  if (m.includes('webp')) return 'webp';
  if (m.includes('mp4'))  return 'mp4';
  if (m.includes('mov'))  return 'mov';
  if (m.includes('webm')) return 'webm';
  if (m.includes('avi'))  return 'avi';
  return 'bin';
}

/** Strip the "data:mime;base64," prefix from a data-URL to get raw base64. */
function extractBase64(dataUrl) {
  const s   = String(dataUrl || '');
  const idx = s.indexOf(',');
  return idx === -1 ? s : s.slice(idx + 1);
}

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Returns true when the stored value is a legacy base64 data-URL
 * (i.e. evidence that was saved before this service existed).
 */
export function isLegacyDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

/**
 * Write evidence to disk and return the relative path to store in the DB.
 *
 * @param {string} completionId  UUID of the task_completions row
 * @param {string} dataUrl       Base64 data-URL ("data:mime;base64,…")
 * @param {string} mime          MIME type string (e.g. "image/jpeg")
 * @returns {Promise<string>}    Relative path, e.g. "evidence/abc123.jpg"
 */
export async function saveEvidenceFile(completionId, dataUrl, mime) {
  await ensureEvidenceDir();
  const filename = `${completionId}.${mimeToExt(mime)}`;
  const filepath = path.join(EVIDENCE_DIR, filename);
  await writeFile(filepath, Buffer.from(extractBase64(dataUrl), 'base64'));
  return `evidence/${filename}`;
}

/**
 * Read evidence from disk.
 *
 * @param {string} relPath  Relative path as stored in DB (e.g. "evidence/abc.jpg")
 * @returns {Promise<Buffer>}
 */
export async function readEvidenceFile(relPath) {
  return readFile(path.join(DATA_DIR, relPath));
}

/**
 * Delete an evidence file from disk.  Silently ignores missing files so
 * callers never have to guard against ENOENT.
 *
 * @param {string} relPath  Relative path as stored in DB
 */
export async function deleteEvidenceFile(relPath) {
  try {
    await unlink(path.join(DATA_DIR, relPath));
  } catch { /* ignore - file may already be gone */ }
}
