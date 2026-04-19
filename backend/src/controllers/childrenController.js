import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { childCreateSchema } from '../utils/validation.js';
import { ApiError } from '../utils/errors.js';
import { verifyEmailExists } from '../services/emailExistenceService.js';
import { env } from '../config/env.js';

const AVATAR_DIR = path.join(path.dirname(path.resolve(env.databasePath)), 'avatars');

async function ensureAvatarDir() {
  if (!existsSync(AVATAR_DIR)) await mkdir(AVATAR_DIR, { recursive: true });
}

function mimeToExt(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  return 'jpg';
}

function sanitizeText(value, max = 80) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function getAgeYears(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export async function createChild(req, res, next) {
  try {
    const data = childCreateSchema.parse(req.body);
    const name = sanitizeText(data.name, 80);
    if (!name) throw new ApiError(400, 'Child name cannot be empty');

    const now = new Date().toISOString();
    const id = uuidv4();
    const db = await getDb();
    const email = data.email ? data.email.toLowerCase() : null;
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : null;
    const age = getAgeYears(data.dateOfBirth);
    if (age < 6 || age > 13) {
      throw new ApiError(400, 'Child age must be between 6 and 13 years');
    }
    const isYoungerChild = age <= 9;

    if (email) {
      const existing = await db.get('SELECT id FROM child_profiles WHERE email = ?', [email]);
      if (existing) throw new ApiError(409, 'Child email already in use');

      const emailCheck = await verifyEmailExists(email);
      if (!emailCheck.ok) {
        throw new ApiError(400, emailCheck.message || 'Please use a valid child email address that can receive mail.');
      }
    }

    if (isYoungerChild) {
      if (!pinHash && !passwordHash) {
        throw new ApiError(400, 'For younger children, provide a 4-digit PIN or email/password login.');
      }
    } else {
      if (!passwordHash) {
        throw new ApiError(400, 'For children age 10+, email and password are required.');
      }
      if (pinHash) {
        throw new ApiError(400, 'PIN mode is only available for younger children.');
      }
    }

    await db.run(
      `INSERT INTO child_profiles (id, parent_id, name, date_of_birth, email, password_hash, pin_hash, points_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, req.auth.parentId, name, data.dateOfBirth, email, passwordHash, pinHash, now, now]
    );

    return res.status(201).json({
      id,
      name,
      dateOfBirth: data.dateOfBirth,
      email,
      pointsBalance: 0,
      giftcardPointsBalance: 0,
      hasPasswordLogin: Boolean(passwordHash),
      hasPinLogin: Boolean(pinHash)
    });
  } catch (error) {
    next(error);
  }
}

export async function listChildren(req, res, next) {
  try {
    const db = await getDb();
    const children = await db.all(
      `SELECT id,
              name,
              date_of_birth as dateOfBirth,
              email,
              password_hash as passwordHash,
              pin_hash as pinHash,
              points_balance as pointsBalance,
              giftcard_points_balance as giftcardPointsBalance,
              created_at as createdAt
       FROM child_profiles
       WHERE parent_id = ?
       ORDER BY created_at DESC`,
      [req.auth.parentId]
    );

    return res.json(children.map((child) => ({
      id: child.id,
      name: child.name,
      dateOfBirth: child.dateOfBirth,
      email: child.email,
      pointsBalance: child.pointsBalance,
      giftcardPointsBalance: child.giftcardPointsBalance,
      avatarUrl: child.avatarUrl || null,
      createdAt: child.createdAt,
      hasPasswordLogin: Boolean(child.passwordHash),
      hasPinLogin: Boolean(child.pinHash)
    })));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /children/leaderboard
 * Returns children for this parent ranked by RP balance, with weekly task count and streak.
 */
export async function leaderboard(req, res, next) {
  try {
    const db = await getDb();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const rows = await db.all(
      `SELECT
         cp.id,
         cp.name,
         cp.points_balance AS rpBalance,
         cp.giftcard_points_balance AS gpBalance,
         cp.current_streak_days AS streak,
         COUNT(t.id) AS weeklyTasks,
         COALESCE(SUM(t.points), 0) AS weeklyRp
       FROM child_profiles cp
       LEFT JOIN tasks t ON t.child_id = cp.id
         AND t.state = 'Approved'
         AND t.approved_at >= ?
       WHERE cp.parent_id = ?
       GROUP BY cp.id
       ORDER BY cp.points_balance DESC`,
      [weekAgo, req.auth.parentId]
    );

    return res.json(rows.map((r, i) => ({ ...r, rank: i + 1 })));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /children/:id
 * Permanently removes a child profile owned by the requesting parent.
 * All child data (tasks, points, sessions) is removed via DB CASCADE.
 */
export async function deleteChild(req, res, next) {
  try {
    const { id } = req.params;
    const db = await getDb();

    const child = await db.get(
      'SELECT id, name FROM child_profiles WHERE id = ? AND parent_id = ?',
      [id, req.auth.parentId]
    );
    if (!child) throw new ApiError(404, 'Child not found');

    await db.run('DELETE FROM child_profiles WHERE id = ?', [id]);

    return res.json({ message: `${child.name} has been removed.` });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /children/:id/avatar
 * Body: { avatarData: "data:image/jpeg;base64,...", avatarMime: "image/jpeg" }
 * Parent only - can only upload for their own children.
 */
export async function uploadChildAvatar(req, res, next) {
  try {
    const { id } = req.params;
    const { avatarData, avatarMime } = req.body;

    if (!avatarData || !avatarMime) {
      throw new ApiError(400, 'avatarData and avatarMime are required');
    }
    if (!String(avatarMime).startsWith('image/')) {
      throw new ApiError(400, 'Only image files are allowed for avatars');
    }

    const db = await getDb();
    const child = await db.get(
      'SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?',
      [id, req.auth.parentId]
    );
    if (!child) throw new ApiError(404, 'Child not found');

    await ensureAvatarDir();

    // Extract base64 payload
    const raw = String(avatarData);
    const idx = raw.indexOf(',');
    const base64 = idx === -1 ? raw : raw.slice(idx + 1);
    const ext = mimeToExt(avatarMime);
    const filename = `${id}.${ext}`;
    const filepath = path.join(AVATAR_DIR, filename);
    await writeFile(filepath, Buffer.from(base64, 'base64'));

    const avatarUrl = `avatars/${filename}`;
    await db.run('UPDATE child_profiles SET avatar_url = ? WHERE id = ?', [avatarUrl, id]);

    return res.json({ avatarUrl });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /children/:id/avatar
 * Returns the avatar image file. Accessible by parent + child (requireAnyAuth).
 */
export async function serveChildAvatar(req, res, next) {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Parent can see their children; child can see their own
    let child;
    if (req.auth.role === 'parent') {
      child = await db.get(
        'SELECT avatar_url as avatarUrl FROM child_profiles WHERE id = ? AND parent_id = ?',
        [id, req.auth.parentId]
      );
    } else {
      child = await db.get(
        'SELECT avatar_url as avatarUrl FROM child_profiles WHERE id = ?',
        [req.auth.childId === id ? id : null]
      );
    }

    if (!child || !child.avatarUrl) throw new ApiError(404, 'Avatar not found');

    const DATA_DIR = path.dirname(path.resolve(env.databasePath));
    const filepath = path.join(DATA_DIR, child.avatarUrl);

    if (!existsSync(filepath)) throw new ApiError(404, 'Avatar file not found');

    const ext = path.extname(filepath).toLowerCase().slice(1);
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    res.set('Content-Type', mimeMap[ext] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filepath);
  } catch (error) {
    next(error);
  }
}
