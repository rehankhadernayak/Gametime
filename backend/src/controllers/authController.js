import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import { sanitizeText } from '../utils/sanitize.js';
import { PIN_LOGIN_MAX_AGE_YEARS } from '../utils/constants.js';
import { verifyEmailExists } from '../services/emailExistenceService.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import {
  deleteSingleParentAccount,
  pgDeleteFamilyCascade,
  pgGetFamilyIdForParent,
  pgHasFamiliesModel,
  pgResolveParentTable
} from '../services/accountDeletionService.js';
import {
  childElevateToParentSchema,
  childLoginSchema,
  childSessionLoginSchema,
  childPinLoginSchema,
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema
} from '../utils/validation.js';
import { verifyGoogleIdentity } from '../services/googleVerifyService.js';

/* ── Brute-force lockout helpers ────────────────────────────────────────
   Track failed logins per identifier (email / parentEmail+childName).
   After MAX_ATTEMPTS failures inside LOCKOUT_WINDOW_MS the account is
   locked for LOCKOUT_WINDOW_MS.  Attempts older than the window are
   invisible to the query so they expire naturally.
   ────────────────────────────────────────────────────────────────────── */
const MAX_ATTEMPTS      = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function checkLockout(db, identifier) {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS).toISOString();
  const row = await db.get(
    'SELECT COUNT(*) AS count FROM failed_login_attempts WHERE identifier = ? AND created_at > ?',
    [identifier, since]
  );
  if ((row?.count ?? 0) >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many failed attempts. Account is locked for 15 minutes.');
  }
}

async function recordFailure(db, identifier) {
  await db.run(
    'INSERT INTO failed_login_attempts (id, identifier, created_at) VALUES (?, ?, ?)',
    [uuidv4(), identifier, new Date().toISOString()]
  );
}

async function clearAttempts(db, identifier) {
  await db.run('DELETE FROM failed_login_attempts WHERE identifier = ?', [identifier]);
}

/**
 * Parse a JWT-style duration string (e.g. '2h', '7d', '30m') into milliseconds.
 * Falls back to 2 hours if the format is unrecognised.
 */
function parseDurationMs(value) {
  const str = String(value || '').trim();
  const match = str.match(/^(\d+)([smhd]?)$/i);
  if (!match) return 2 * 60 * 60 * 1000; // 2h default
  const num = parseInt(match[1], 10);
  switch ((match[2] || 's').toLowerCase()) {
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'm': return num * 60 * 1000;
    default:  return num * 1000; // seconds
  }
}

const SESSION_DURATION_MS = parseDurationMs(env.jwtExpiresIn);

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    // In production the web frontend (vercel.app / custom domain) is served
    // from a different origin than the API, so the cookie has to be marked
    // SameSite=None and Secure to be sent on cross-site requests.
    // Locally (http://localhost) Chrome won't accept SameSite=None+Secure
    // over plain HTTP, so we keep Lax for dev.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: SESSION_DURATION_MS
  };
}

/** Non-httpOnly role hint for UI gating (never trust for authorization). */
function userRoleCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: SESSION_DURATION_MS,
    path: '/'
  };
}

function setUserRoleCookie(res, role) {
  const value = role === 'parent' || role === 'child' ? role : '';
  if (!value) return;
  res.cookie('user_role', value, userRoleCookieOptions());
}

function clearUserRoleCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('user_role', {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
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

async function issueToken(res, payload) {
  const db = await getDb();
  const sessionId = uuidv4();
  const now = new Date();
  // Session DB expiry is derived from the same JWT_EXPIRES_IN config, not hardcoded.
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();

  await db.run(
    'INSERT INTO sessions (id, parent_id, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, 0)',
    [sessionId, payload.parentId, now.toISOString(), expiresAt]
  );

  const token = jwt.sign({ ...payload, sessionId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie('gametime_token', token, cookieOptions());
  setUserRoleCookie(res, payload.role);
  return token;
}

export async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);
    const db = await getDb();
    const email = data.email.toLowerCase();
    const name = sanitizeText(data.name, 80);
    if (name.length < 2) throw new ApiError(400, 'Name must be at least 2 characters');

    const existing = await db.get('SELECT id FROM parent_accounts WHERE email = ?', [email]);
    if (existing) throw new ApiError(409, 'Email already registered');

    const emailCheck = await verifyEmailExists(email);
    if (!emailCheck.ok) {
      throw new ApiError(400, emailCheck.message || 'Please use a valid email address that can receive mail.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO parent_accounts (id, name, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, email, passwordHash, now, now]
    );

    const token = await issueToken(res, { role: 'parent', parentId: id, isAdmin: false });

    // Fire-and-forget - never block signup on email delivery.
    sendWelcomeEmail(email, name).then(({ previewUrl, deliveryMode }) => {
      if (deliveryMode === 'test' && previewUrl) {
        logger.info({ previewUrl }, 'Welcome email preview (Ethereal)');
      }
    }).catch((err) => {
      logger.warn({ err, parentId: id }, 'Welcome email failed - account created successfully');
    });

    return res.status(201).json({ token, parent: { id, name, email, isAdmin: false } });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const db = await getDb();
    const email = data.email.toLowerCase();

    await checkLockout(db, `parent:${email}`);

    const parent = await db.get('SELECT * FROM parent_accounts WHERE email = ?', [email]);
    if (!parent) {
      await recordFailure(db, `parent:${email}`);
      throw new ApiError(401, 'Invalid credentials');
    }

    const matches = await bcrypt.compare(data.password, parent.password_hash);
    if (!matches) {
      await recordFailure(db, `parent:${email}`);
      throw new ApiError(401, 'Invalid credentials');
    }

    await clearAttempts(db, `parent:${email}`);
    const isAdmin = Boolean(parent.is_admin);
    const token = await issueToken(res, { role: 'parent', parentId: parent.id, isAdmin });
    return res.json({
      token,
      parent: { id: parent.id, name: parent.name, email: parent.email, isAdmin }
    });
  } catch (error) {
    next(error);
  }
}

export async function childLogin(req, res, next) {
  try {
    const { childId } = childSessionLoginSchema.parse(req.body);
    const parentId = req.auth.parentId;
    const db = await getDb();

    const child = await db.get('SELECT * FROM child_profiles WHERE id = ? AND parent_id = ?', [childId, parentId]);
    if (!child) throw new ApiError(404, 'Child not found');

    const token = await issueToken(res, { role: 'child', parentId, childId: child.id });
    return res.json({
      token,
      child: {
        id: child.id,
        name: child.name,
        pointsBalance: child.points_balance,
        giftcardPointsBalance: child.giftcard_points_balance
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function childDirectLogin(req, res, next) {
  try {
    const data = childLoginSchema.parse(req.body);
    const db = await getDb();
    const email = data.email.toLowerCase();

    await checkLockout(db, `child:${email}`);

    const child = await db.get('SELECT * FROM child_profiles WHERE email = ?', [email]);
    if (!child || !child.password_hash) {
      await recordFailure(db, `child:${email}`);
      throw new ApiError(401, 'Invalid child credentials');
    }

    const matches = await bcrypt.compare(data.password, child.password_hash);
    if (!matches) {
      await recordFailure(db, `child:${email}`);
      throw new ApiError(401, 'Invalid child credentials');
    }

    await clearAttempts(db, `child:${email}`);
    const token = await issueToken(res, { role: 'child', parentId: child.parent_id, childId: child.id });
    return res.json({
      token,
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
        pointsBalance: child.points_balance,
        giftcardPointsBalance: child.giftcard_points_balance
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function childPinLogin(req, res, next) {
  try {
    const data = childPinLoginSchema.parse(req.body);
    const db = await getDb();

    // Lockout key combines parent email + child name so siblings don't share a lockout
    const lockoutKey = `pin:${data.parentEmail.toLowerCase()}:${data.childName.trim().toLowerCase()}`;
    await checkLockout(db, lockoutKey);

    const parent = await db.get('SELECT id FROM parent_accounts WHERE email = ?', [data.parentEmail.toLowerCase()]);
    if (!parent) {
      await recordFailure(db, lockoutKey);
      throw new ApiError(401, 'Invalid parent email, child name, or PIN');
    }

    const child = await db.get(
      `SELECT * FROM child_profiles
       WHERE parent_id = ? AND LOWER(name) = LOWER(?)`,
      [parent.id, data.childName.trim()]
    );
    if (!child || !child.pin_hash) {
      await recordFailure(db, lockoutKey);
      throw new ApiError(401, 'Invalid parent email, child name, or PIN');
    }

    const age = getAgeYears(child.date_of_birth);
    if (age > PIN_LOGIN_MAX_AGE_YEARS) {
      throw new ApiError(403, 'PIN login is only available for younger children');
    }

    const matches = await bcrypt.compare(data.pin, child.pin_hash);
    if (!matches) {
      await recordFailure(db, lockoutKey);
      throw new ApiError(401, 'Invalid parent email, child name, or PIN');
    }

    await clearAttempts(db, lockoutKey);
    const token = await issueToken(res, { role: 'child', parentId: child.parent_id, childId: child.id });
    return res.json({
      token,
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
        pointsBalance: child.points_balance,
        giftcardPointsBalance: child.giftcard_points_balance
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const db = await getDb();
    if (req.auth.role === 'parent') {
      const parent = await db.get(
        'SELECT id, name, email, gp_balance as gpBalance, is_admin as isAdmin, created_at as createdAt FROM parent_accounts WHERE id = ?',
        [req.auth.parentId]
      );
      if (parent) parent.isAdmin = Boolean(parent.isAdmin);
      return res.json({ role: 'parent', user: parent });
    }

    const child = await db.get(
      `SELECT id,
              name,
              email,
              points_balance as pointsBalance,
              giftcard_points_balance as giftcardPointsBalance,
              time_bank_minutes as timeBankMinutes,
              date_of_birth as dateOfBirth,
              avatar_url as avatarUrl,
              family_id as familyId
       FROM child_profiles
       WHERE id = ?`,
      [req.auth.childId]
    );
    return res.json({ role: 'child', user: child });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const db = await getDb();
    await db.run('UPDATE sessions SET revoked = 1 WHERE id = ?', [req.auth.sessionId]);
    res.clearCookie('gametime_token');
    clearUserRoleCookie(res);
    return res.json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/sync-cookies
 * Refreshes the readable `user_role` cookie from the validated session (JWT in
 * cookie or Authorization header). Used after legacy localStorage-only upgrades.
 */
export async function syncSessionCookies(req, res, next) {
  try {
    setUserRoleCookie(res, req.auth.role);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/elevate-to-parent
 * Child proves they know the parent account password; issues a parent JWT for the same household.
 */
export async function childElevateToParent(req, res, next) {
  try {
    if (req.auth.role !== 'child') {
      throw new ApiError(403, 'Child session required');
    }
    const { password } = childElevateToParentSchema.parse(req.body);
    const db = await getDb();

    const parent = await db.get(
      'SELECT id, name, email, password_hash, is_admin as isAdmin FROM parent_accounts WHERE id = ?',
      [req.auth.parentId]
    );
    if (!parent) throw new ApiError(404, 'Parent account not found');

    const matches = await bcrypt.compare(password, parent.password_hash);
    if (!matches) {
      throw new ApiError(401, 'Invalid parent password');
    }

    await db.run('UPDATE sessions SET revoked = 1 WHERE id = ?', [req.auth.sessionId]);

    const isAdmin = Boolean(parent.isAdmin);
    const token = await issueToken(res, { role: 'parent', parentId: parent.id, isAdmin });

    return res.json({
      token,
      parent: {
        id: parent.id,
        name: parent.name,
        email: parent.email,
        isAdmin
      }
    });
  } catch (error) {
    next(error);
  }
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const db = await getDb();

    const parent = await db.get('SELECT id, name FROM parent_accounts WHERE email = ?', [email]);

    // Always respond with the same message to prevent email enumeration.
    if (!parent) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Invalidate any existing unused tokens for this parent.
    await db.run(
      `DELETE FROM password_reset_tokens WHERE parent_id = ? AND used_at IS NULL`,
      [parent.id]
    );

    // Generate token: 32 random bytes → hex raw token, store SHA-256 hash.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    await db.run(
      `INSERT INTO password_reset_tokens (id, parent_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), parent.id, tokenHash, expiresAt]
    );

    const frontendOrigin = env.frontendOrigins[0] || 'http://localhost:5173';
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawToken}`;

    const { previewUrl, deliveryMode } = await sendPasswordResetEmail(parent.email, parent.name, resetUrl);

    if (deliveryMode === 'test' && previewUrl) {
      logger.info({ previewUrl }, 'Password reset email preview (Ethereal)');
    }

    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const db = await getDb();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const nowIso = new Date().toISOString();
    const record = await db.get(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
      [tokenHash, nowIso]
    );

    if (!record) {
      throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await db.run('UPDATE parent_accounts SET password_hash = ? WHERE id = ?', [passwordHash, record.parent_id]);
    await db.run('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [now, record.id]);

    // Revoke all active sessions so the old password can't be reused.
    await db.run(
      `UPDATE sessions SET revoked = 1 WHERE parent_id = ? AND revoked = 0`,
      [record.parent_id]
    );

    logger.info({ parentId: record.parent_id }, 'Password reset completed');
    return res.json({ message: 'Password updated. Please log in with your new password.' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/change-password
 * Allows an authenticated parent to change their own password.
 * Requires currentPassword + newPassword in the request body.
 */
export async function changePassword(req, res, next) {
  try {
    const db = await getDb();
    const parentId = req.auth.parentId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      throw new ApiError(400, 'Current password is required.');
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new ApiError(400, 'New password must be at least 8 characters.');
    }
    if (currentPassword === newPassword) {
      throw new ApiError(400, 'New password must be different from your current password.');
    }

    const parent = await db.get('SELECT password_hash FROM parent_accounts WHERE id = ?', [parentId]);
    if (!parent) throw new ApiError(404, 'Account not found');

    const matches = await bcrypt.compare(currentPassword, parent.password_hash);
    if (!matches) throw new ApiError(403, 'Current password is incorrect.');

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE parent_accounts SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, new Date().toISOString(), parentId]);

    logger.info({ parentId }, 'Password changed');
    return res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /auth/export-data
 * PDPA-compliant full data export for the requesting parent.
 * Returns JSON of everything stored for this account - no passwords.
 */
export async function exportData(req, res, next) {
  try {
    const db = await getDb();
    const parentId = req.auth.parentId;

    const [parent, children, tasks, completions, points, gaming, notifications, achievements] = await Promise.all([
      db.get('SELECT id, name, email, gp_balance, created_at, updated_at FROM parent_accounts WHERE id = ?', [parentId]),
      db.all('SELECT id, name, date_of_birth, email, points_balance, giftcard_points_balance, current_streak_days, created_at FROM child_profiles WHERE parent_id = ?', [parentId]),
      db.all(`SELECT t.id, t.title, t.description, t.points, t.gp_points, t.state, t.category, t.due_date, t.created_at, t.approved_at, cp.name as childName
              FROM tasks t JOIN child_profiles cp ON cp.id = t.child_id WHERE cp.parent_id = ? ORDER BY t.created_at DESC`, [parentId]),
      db.all(`SELECT tc.id, tc.task_id, tc.evidence_type, tc.evidence_note, tc.ai_recommendation, tc.ai_confidence, tc.ai_reason, tc.resolved_at, tc.created_at
              FROM task_completions tc JOIN tasks t ON t.id = tc.task_id JOIN child_profiles cp ON cp.id = t.child_id WHERE cp.parent_id = ? ORDER BY tc.created_at DESC`, [parentId]),
      db.all(`SELECT pt.id, pt.child_id, pt.type, pt.points, pt.points_kind, pt.reference_type, pt.created_at
              FROM points_transactions pt JOIN child_profiles cp ON cp.id = pt.child_id WHERE cp.parent_id = ? ORDER BY pt.created_at DESC`, [parentId]),
      db.all(`SELECT gs.id, gs.child_id, gs.game_name, gs.platform, gs.granted_minutes, gs.duration_minutes, gs.status, gs.started_at, gs.ended_at
              FROM gaming_sessions gs JOIN child_profiles cp ON cp.id = gs.child_id WHERE cp.parent_id = ? ORDER BY gs.started_at DESC`, [parentId]),
      db.all(`SELECT n.id, n.recipient_type, n.message, n.is_read, n.created_at
              FROM notifications n WHERE n.recipient_id = ? ORDER BY n.created_at DESC`, [parentId]),
      db.all(`SELECT ca.child_id, a.key, a.name, a.type, ca.unlocked_at
              FROM child_achievements ca JOIN achievements a ON a.id = ca.achievement_id
              JOIN child_profiles cp ON cp.id = ca.child_id WHERE cp.parent_id = ?`, [parentId]),
    ]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="gametime-data-${new Date().toISOString().slice(0,10)}.json"`);
    return res.json({
      exportedAt: new Date().toISOString(),
      account: parent,
      children,
      tasks,
      taskCompletions: completions,
      pointsTransactions: points,
      gamingSessions: gaming,
      notifications,
      achievements
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/google
 * Accepts a Google ID token (web / native) or OAuth access token (web implicit fallback).
 * Parent: intent signin | signup. Child: sign-in only for an existing profile with matching email/Google link.
 */
export async function googleAuth(req, res, next) {
  try {
    const body = googleAuthSchema.parse(req.body);
    const { role, intent } = body;
    const profile = await verifyGoogleIdentity({
      idToken: body.idToken,
      accessToken: body.accessToken
    });
    const { sub, email, name: googleName } = profile;
    const db = await getDb();

    if (role === 'parent') {
      const parentBySub = await db.get('SELECT * FROM parent_accounts WHERE google_sub = ?', [sub]);
      const parentByEmail = await db.get('SELECT * FROM parent_accounts WHERE email = ?', [email]);
      if (parentBySub && parentByEmail && parentBySub.id !== parentByEmail.id) {
        throw new ApiError(409, 'Google account data conflicts with an existing Gametime account.');
      }
      const parent = parentBySub || parentByEmail;
      if (parent?.google_sub && parent.google_sub !== sub) {
        throw new ApiError(403, 'This email is linked to a different Google account.');
      }

      if (intent === 'signin') {
        if (!parent) {
          throw new ApiError(404, 'No Gametime parent account for this Google user. Create an account first.');
        }
        // Reject account squatting: password signup on a victim email before Google is linked.
        if (!parentBySub && parentByEmail && !parent.google_sub) {
          throw new ApiError(
            403,
            'This email is registered with a password. Sign in with email and password instead.'
          );
        }
        if (parent.google_sub !== sub) {
          await db.run('UPDATE parent_accounts SET google_sub = ?, updated_at = ? WHERE id = ?', [
            sub,
            new Date().toISOString(),
            parent.id
          ]);
        }
        await clearAttempts(db, `parent:${email}`);
        const isAdmin = Boolean(parent.is_admin);
        const token = await issueToken(res, { role: 'parent', parentId: parent.id, isAdmin });
        return res.json({
          token,
          parent: { id: parent.id, name: parent.name, email: parent.email, isAdmin }
        });
      }

      // signup
      if (parent) {
        throw new ApiError(409, 'This Google account already has a Gametime parent profile. Sign in instead.');
      }
      const displayName = sanitizeText(googleName, 80);
      if (displayName.length < 2) throw new ApiError(400, 'Name must be at least 2 characters.');
      const passwordHash = await bcrypt.hash(`oauth-google-${uuidv4()}`, 10);
      const id = uuidv4();
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO parent_accounts (id, name, email, password_hash, google_sub, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, displayName, email, passwordHash, sub, now, now]
      );
      const token = await issueToken(res, { role: 'parent', parentId: id, isAdmin: false });
      sendWelcomeEmail(email, displayName)
        .then(({ previewUrl, deliveryMode }) => {
          if (deliveryMode === 'test' && previewUrl) {
            logger.info({ previewUrl }, 'Welcome email preview (Ethereal)');
          }
        })
        .catch((err) => {
          logger.warn({ err, parentId: id }, 'Welcome email failed - Google account created successfully');
        });
      return res.status(201).json({ token, parent: { id, name: displayName, email, isAdmin: false } });
    }

    // child
    const childBySub = await db.get('SELECT * FROM child_profiles WHERE google_sub = ?', [sub]);
    const childByEmail = email ? await db.get('SELECT * FROM child_profiles WHERE email = ?', [email]) : null;
    if (childBySub && childByEmail && childBySub.id !== childByEmail.id) {
      throw new ApiError(409, 'Google account data conflicts with an existing child profile.');
    }
    const child = childBySub || childByEmail;
    if (!child) {
      throw new ApiError(404, 'No child profile for this Google account. Ask your parent to add you in Gametime first.');
    }
    if (child.google_sub && child.google_sub !== sub) {
      throw new ApiError(403, 'This child profile is linked to a different Google account.');
    }
    if (child.google_sub !== sub) {
      await db.run('UPDATE child_profiles SET google_sub = ?, updated_at = ? WHERE id = ?', [
        sub,
        new Date().toISOString(),
        child.id
      ]);
    }
    await clearAttempts(db, `child:${email}`);
    const token = await issueToken(res, { role: 'child', parentId: child.parent_id, childId: child.id });
    return res.json({
      token,
      child: {
        id: child.id,
        name: child.name,
        email: child.email,
        pointsBalance: child.points_balance,
        giftcardPointsBalance: child.giftcard_points_balance
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /auth/account
 * Permanently deletes the signed-in parent's household. On Postgres with the `families` model,
 * deletes the whole family (co-parent + children). Otherwise deletes the single parent row (SQLite).
 * Requires password confirmation in the request body.
 */
export async function deleteAccount(req, res, next) {
  try {
    const db = await getDb();
    const parentId = req.auth.parentId;
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      throw new ApiError(400, 'Password confirmation is required to delete your account.');
    }

    const isPg = Boolean(env.databaseUrl);
    const parentTable = isPg ? await pgResolveParentTable(db) : 'parent_accounts';
    const parent = await db.get(`SELECT password_hash FROM ${parentTable} WHERE id = ?`, [parentId]);
    if (!parent) throw new ApiError(404, 'Account not found');

    const matches = await bcrypt.compare(password, parent.password_hash);
    if (!matches) throw new ApiError(403, 'Incorrect password. Account not deleted.');

    if (isPg && (await pgHasFamiliesModel(db))) {
      const familyId = await pgGetFamilyIdForParent(db, parentTable, parentId);
      if (familyId) {
        await pgDeleteFamilyCascade(db, familyId, parentTable);
      } else {
        await deleteSingleParentAccount(db, parentId, parentTable);
      }
    } else {
      await deleteSingleParentAccount(db, parentId, 'parent_accounts');
    }

    res.clearCookie('gametime_token');
    clearUserRoleCookie(res);
    return res.json({
      message: 'Account permanently deleted.',
      dataRemovalNotice:
        'All data will be removed from our servers within 24 hours to comply with privacy regulations.'
    });
  } catch (error) {
    next(error);
  }
}
