import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';

/**
 * Upsert a memory key/value for a parent.
 * @param {string} parentId
 * @param {string} key
 * @param {string} value
 */
export async function setMemory(parentId, key, value) {
  const db  = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO family_ai_memory (id, parent_id, key, value, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(parent_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [uuidv4(), parentId, key, String(value), now]
  );
}

/**
 * Retrieve a single memory value, or null if not set.
 * @param {string} parentId
 * @param {string} key
 * @returns {Promise<string|null>}
 */
export async function getMemory(parentId, key) {
  const db  = await getDb();
  const row = await db.get(
    'SELECT value FROM family_ai_memory WHERE parent_id = ? AND key = ?',
    [parentId, key]
  );
  return row?.value ?? null;
}

/**
 * Return all memory for a parent as a { key: value } map.
 * @param {string} parentId
 * @returns {Promise<Record<string, string>>}
 */
export async function getAllMemory(parentId) {
  const db   = await getDb();
  const rows = await db.all(
    'SELECT key, value FROM family_ai_memory WHERE parent_id = ?',
    [parentId]
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/**
 * Format all memory as a string block suitable for injection into a system prompt.
 * @param {string} parentId
 * @returns {Promise<string>}
 */
export async function buildMemoryContext(parentId) {
  const memory = await getAllMemory(parentId);
  const entries = Object.entries(memory);
  if (entries.length === 0) return '';
  const lines = entries.map(([k, v]) => `- ${k}: ${v}`).join('\n');
  return `## Family Context\n${lines}`;
}
