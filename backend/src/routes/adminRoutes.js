import { Router } from 'express';
import { requireAdminAuth } from '../middleware/auth.js';
import { getDb } from '../db/connection.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import {
  addPlatformCodes,
  listPlatformCodes,
  removePlatformCode
} from '../services/platformCodesService.js';

const readLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 });
const router = Router();

/**
 * GET /admin/stats
 * Platform-wide aggregate metrics.
 */
router.get('/stats', requireAdminAuth, readLimiter, async (_req, res, next) => {
  try {
    const db = await getDb();
    const [parents, children, tasks, sessions] = await Promise.all([
      db.get('SELECT COUNT(*) AS total FROM parent_accounts'),
      db.get('SELECT COUNT(*) AS total FROM child_profiles'),
      db.get(`SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN state = 'Approved' THEN 1 ELSE 0 END) AS approved,
                SUM(CASE WHEN state = 'PendingApproval' THEN 1 ELSE 0 END) AS pending
              FROM tasks`),
      db.get(`SELECT COUNT(*) AS total FROM gaming_sessions WHERE status = 'Started'`),
    ]);
    return res.json({
      totalParents: parents.total,
      totalChildren: children.total,
      totalTasks: tasks.total,
      approvedTasks: tasks.approved,
      pendingApprovals: tasks.pending,
      activeGamingSessions: sessions.total,
    });
  } catch (err) { next(err); }
});

/**
 * GET /admin/families
 * Paginated list of all families (parent + child count).
 */
router.get('/families', requireAdminAuth, readLimiter, async (req, res, next) => {
  try {
    const db = await getDb();
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim() || '';

    const where = search ? `WHERE pa.name LIKE ? OR pa.email LIKE ?` : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];

    const [{ total }] = await db.all(`SELECT COUNT(*) AS total FROM parent_accounts pa ${where}`, params);
    const families = await db.all(
      `SELECT pa.id, pa.name, pa.email, pa.is_admin AS isAdmin, pa.created_at AS createdAt,
              COUNT(cp.id) AS childCount
       FROM parent_accounts pa
       LEFT JOIN child_profiles cp ON cp.parent_id = pa.id
       ${where}
       GROUP BY pa.id
       ORDER BY pa.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({ families, total, page, limit });
  } catch (err) { next(err); }
});

/**
 * GET /admin/families/:id
 * Full detail for one family.
 */
router.get('/families/:id', requireAdminAuth, readLimiter, async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const parent = await db.get(
      'SELECT id, name, email, gp_balance AS gpBalance, is_admin AS isAdmin, created_at AS createdAt FROM parent_accounts WHERE id = ?',
      [id]
    );
    if (!parent) return res.status(404).json({ error: 'Family not found' });

    const [children, taskStats] = await Promise.all([
      db.all('SELECT id, name, points_balance AS rpBalance, giftcard_points_balance AS gpBalance, current_streak_days AS streak FROM child_profiles WHERE parent_id = ?', [id]),
      db.get(`SELECT COUNT(*) AS total, SUM(CASE WHEN state = 'Approved' THEN 1 ELSE 0 END) AS approved
              FROM tasks t JOIN child_profiles cp ON cp.id = t.child_id WHERE cp.parent_id = ?`, [id]),
    ]);

    return res.json({ parent, children, taskStats });
  } catch (err) { next(err); }
});

/**
 * PATCH /admin/families/:id/admin
 * Grant or revoke admin flag for a parent.
 */
router.patch('/families/:id/admin', requireAdminAuth, readLimiter, async (req, res, next) => {
  try {
    const db = await getDb();
    const { isAdmin } = req.body;
    if (typeof isAdmin !== 'boolean') return res.status(400).json({ error: 'isAdmin must be boolean' });
    await db.run('UPDATE parent_accounts SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, req.params.id]);
    return res.json({ message: 'Admin flag updated' });
  } catch (err) { next(err); }
});

/* ── Platform giftcard code pool ──────────────────────────────────────── */

/**
 * POST /admin/codes
 * Add giftcard codes to the platform pool.
 * Body: { brand, denominationCents, currency?, label?, codes: [{code, pin?}] }
 */
router.post('/codes', requireAdminAuth, createRateLimiter({ windowMs: 60_000, maxRequests: 20 }), async (req, res, next) => {
  try {
    const { brand, denominationCents, currency, label, codes } = req.body ?? {};
    const adminId = req.auth.parentId;
    const result = await addPlatformCodes(adminId, { brand, denominationCents, currency, label, codes });
    return res.status(201).json(result);
  } catch (err) { next(err); }
});

/**
 * GET /admin/codes
 * List platform codes with optional filters: ?brand=Roblox&status=Available&page=1&limit=50
 */
router.get('/codes', requireAdminAuth, readLimiter, async (req, res, next) => {
  try {
    const { brand, status, page, limit } = req.query;
    const result = await listPlatformCodes({
      brand:  brand  || undefined,
      status: status || undefined,
      page:   parseInt(page  || '1',  10),
      limit:  Math.min(200, parseInt(limit || '50', 10))
    });
    return res.json(result);
  } catch (err) { next(err); }
});

/**
 * DELETE /admin/codes/:id
 * Soft-remove an Available code (cannot remove already-assigned codes).
 */
router.delete('/codes/:id', requireAdminAuth, async (req, res, next) => {
  try {
    const result = await removePlatformCode(req.params.id);
    return res.json(result);
  } catch (err) { next(err); }
});

export default router;
