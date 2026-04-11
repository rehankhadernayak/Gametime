import { getDb } from '../db/connection.js';
import { listTransactions, adjustPoints } from '../services/pointsService.js';
import { pointsAdjustSchema } from '../utils/validation.js';
import { sanitizeText } from '../utils/sanitize.js';

export async function adjustPointsController(req, res, next) {
  try {
    const data = pointsAdjustSchema.parse(req.body);
    const note = sanitizeText(data.note, 100);
    if (!note) return res.status(400).json({ error: 'A non-empty reason is required for points adjustment' });

    const db = await getDb();
    const child = await db.get('SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?', [data.childId, req.auth.parentId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    const newBalance = await adjustPoints({
      childId: data.childId,
      points: data.points,
      type: data.points > 0 ? 'Credit' : 'Debit',
      referenceType: 'ManualAdjustment',
      referenceId: note
    });

    return res.json({ childId: data.childId, newBalance });
  } catch (error) {
    next(error);
  }
}

export async function listTransactionsController(req, res, next) {
  try {
    const db = await getDb();
    if (req.auth.role === 'child') {
      if (req.query.childId && req.query.childId !== req.auth.childId) {
        return res.status(403).json({ error: 'Children can only view their own transactions' });
      }
      return res.json(await listTransactions(req.auth.childId));
    }

    const childId = req.query.childId;
    if (!childId) return res.status(400).json({ error: 'childId is required for parent view' });

    const child = await db.get('SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?', [childId, req.auth.parentId]);
    if (!child) return res.status(404).json({ error: 'Child not found' });

    return res.json(await listTransactions(childId));
  } catch (error) {
    next(error);
  }
}
