import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { ApiError } from '../utils/errors.js';

const DEFAULT_SETTINGS = {
  pointsUnit: 10,
  minutesUnit: 15,
  dailyCapMinutes: 90,
  weeklyCapMinutes: 420
};

export const GAMING_DENIAL_CODES = {
  BLOCKED_GAME: 'BLOCKED_GAME',
  ACTIVE_SESSION_EXISTS: 'ACTIVE_SESSION_EXISTS',
  DAILY_CAP_REACHED: 'DAILY_CAP_REACHED',
  WEEKLY_CAP_REACHED: 'WEEKLY_CAP_REACHED',
  NO_MINUTES_FROM_POINTS: 'NO_MINUTES_FROM_POINTS'
};

const DENIAL_METADATA = {
  [GAMING_DENIAL_CODES.BLOCKED_GAME]: {
    lockState: 'PARENT_BLOCK',
    nextStep: 'Ask your parent to allow this game in Game Access List.'
  },
  [GAMING_DENIAL_CODES.ACTIVE_SESSION_EXISTS]: {
    lockState: 'ACTIVE_SESSION',
    nextStep: 'End your active session before starting another one.'
  },
  [GAMING_DENIAL_CODES.DAILY_CAP_REACHED]: {
    lockState: 'DAILY_LIMIT',
    nextStep: 'Daily play cap reached. Try again tomorrow or ask parent to adjust caps.'
  },
  [GAMING_DENIAL_CODES.WEEKLY_CAP_REACHED]: {
    lockState: 'WEEKLY_LIMIT',
    nextStep: 'Weekly play cap reached. Wait for next week or ask parent to adjust caps.'
  },
  [GAMING_DENIAL_CODES.NO_MINUTES_FROM_POINTS]: {
    lockState: 'NO_POINTS_BUDGET',
    nextStep: 'Earn more points from approved tasks to unlock more gaming time.'
  }
};

function sanitizeText(value, max = 80) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function getUtcDayStart(date = new Date()) {
  const out = new Date(date);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function getUtcIsoWeekStart(date = new Date()) {
  const out = getUtcDayStart(date);
  const day = (out.getUTCDay() + 6) % 7;
  out.setUTCDate(out.getUTCDate() - day);
  return out;
}

async function ensureParentChild(db, parentId, childId) {
  const child = await db.get(
    'SELECT id, name, points_balance as pointsBalance FROM child_profiles WHERE id = ? AND parent_id = ?',
    [childId, parentId]
  );
  if (!child) {
    throw new ApiError(404, 'Child not found');
  }
  return child;
}

async function ensureSettings(db, parentId) {
  const existing = await db.get(
    `SELECT parent_id as parentId, points_unit as pointsUnit, minutes_unit as minutesUnit,
            daily_cap_minutes as dailyCapMinutes, weekly_cap_minutes as weeklyCapMinutes,
            created_at as createdAt, updated_at as updatedAt
     FROM gaming_settings
     WHERE parent_id = ?`,
    [parentId]
  );

  if (existing) return existing;

  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO gaming_settings
      (parent_id, points_unit, minutes_unit, daily_cap_minutes, weekly_cap_minutes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      parentId,
      DEFAULT_SETTINGS.pointsUnit,
      DEFAULT_SETTINGS.minutesUnit,
      DEFAULT_SETTINGS.dailyCapMinutes,
      DEFAULT_SETTINGS.weeklyCapMinutes,
      now,
      now
    ]
  );

  return {
    parentId,
    ...DEFAULT_SETTINGS,
    createdAt: now,
    updatedAt: now
  };
}

export async function getGamingSettings(parentId) {
  const db = await getDb();
  return ensureSettings(db, parentId);
}

export async function updateGamingSettings(parentId, payload) {
  const db = await getDb();
  const current = await ensureSettings(db, parentId);
  const now = new Date().toISOString();
  const next = {
    pointsUnit: payload.pointsUnit ?? current.pointsUnit,
    minutesUnit: payload.minutesUnit ?? current.minutesUnit,
    dailyCapMinutes: payload.dailyCapMinutes ?? current.dailyCapMinutes,
    weeklyCapMinutes: payload.weeklyCapMinutes ?? current.weeklyCapMinutes
  };

  if (next.weeklyCapMinutes < next.dailyCapMinutes) {
    throw new ApiError(400, 'Weekly cap must be greater than or equal to daily cap');
  }

  await db.run(
    `UPDATE gaming_settings
     SET points_unit = ?, minutes_unit = ?, daily_cap_minutes = ?, weekly_cap_minutes = ?, updated_at = ?
     WHERE parent_id = ?`,
    [next.pointsUnit, next.minutesUnit, next.dailyCapMinutes, next.weeklyCapMinutes, now, parentId]
  );

  return {
    parentId,
    ...next,
    createdAt: current.createdAt,
    updatedAt: now
  };
}

export async function listParentGames(parentId) {
  const db = await getDb();
  await ensureSettings(db, parentId);
  return db.all(
    `SELECT id, name, platform, status, source, external_id as externalId, created_at as createdAt, updated_at as updatedAt
     FROM gaming_games
     WHERE parent_id = ?
     ORDER BY updated_at DESC`,
    [parentId]
  );
}

async function findGame(db, parentId, gameId) {
  const game = await db.get(
    `SELECT id, parent_id as parentId, name, platform, status, source, external_id as externalId,
            created_at as createdAt, updated_at as updatedAt
     FROM gaming_games
     WHERE id = ? AND parent_id = ?`,
    [gameId, parentId]
  );
  if (!game) throw new ApiError(404, 'Game not found');
  return game;
}

export async function createParentGame(parentId, payload) {
  const db = await getDb();
  await ensureSettings(db, parentId);

  const now = new Date().toISOString();
  const id = uuidv4();
  const name = sanitizeText(payload.name, 80);
  const platform = sanitizeText(payload.platform, 40);
  const status = payload.status ?? 'Blocked';
  const source = sanitizeText(payload.source || 'manual', 20).toLowerCase();
  const externalId = payload.externalId ? sanitizeText(payload.externalId, 120) : null;

  if (!name) throw new ApiError(400, 'Game name is required');
  if (!platform) throw new ApiError(400, 'Platform is required');
  const duplicate = await db.get(
    'SELECT id FROM gaming_games WHERE parent_id = ? AND LOWER(name) = LOWER(?) AND platform = ?',
    [parentId, name, platform]
  );
  if (duplicate) {
    throw new ApiError(409, 'That game already exists for this platform');
  }

  try {
    await db.run(
      `INSERT INTO gaming_games (id, parent_id, name, platform, status, source, external_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, parentId, name, platform, status, source, externalId, now, now]
    );
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      throw new ApiError(409, 'That game already exists for this platform');
    }
    throw error;
  }

  return { id, name, platform, status, source, externalId, createdAt: now, updatedAt: now };
}

export async function syncDetectedGames(parentId, payload) {
  const db = await getDb();
  await ensureSettings(db, parentId);

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;

  await db.exec('BEGIN');
  try {
    for (const game of payload.games) {
      const name = sanitizeText(game.name, 80);
      const platform = sanitizeText(game.platform || payload.platform || 'Unknown', 40);
      if (!name || !platform) continue;

      const existing = await db.get(
        'SELECT id, status FROM gaming_games WHERE parent_id = ? AND LOWER(name) = LOWER(?) AND platform = ?',
        [parentId, name, platform]
      );

      if (existing) {
        await db.run(
          'UPDATE gaming_games SET external_id = COALESCE(?, external_id), source = ?, updated_at = ? WHERE id = ?',
          [game.externalId ? sanitizeText(game.externalId, 120) : null, 'detected', now, existing.id]
        );
        updated += 1;
      } else {
        await db.run(
          `INSERT INTO gaming_games (id, parent_id, name, platform, status, source, external_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'Blocked', 'detected', ?, ?, ?)`,
          [uuidv4(), parentId, name, platform, game.externalId ? sanitizeText(game.externalId, 120) : null, now, now]
        );
        created += 1;
      }
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return { created, updated };
}

export async function updateParentGame(parentId, gameId, payload) {
  const db = await getDb();
  const game = await findGame(db, parentId, gameId);
  const now = new Date().toISOString();

  const next = {
    name: payload.name ? sanitizeText(payload.name, 80) : game.name,
    platform: payload.platform ? sanitizeText(payload.platform, 40) : game.platform,
    status: payload.status ?? game.status,
    externalId: Object.prototype.hasOwnProperty.call(payload, 'externalId')
      ? (payload.externalId ? sanitizeText(payload.externalId, 120) : null)
      : game.externalId
  };

  if (!next.name) throw new ApiError(400, 'Game name is required');
  if (!next.platform) throw new ApiError(400, 'Platform is required');
  const duplicate = await db.get(
    'SELECT id FROM gaming_games WHERE parent_id = ? AND LOWER(name) = LOWER(?) AND platform = ? AND id <> ?',
    [parentId, next.name, next.platform, gameId]
  );
  if (duplicate) {
    throw new ApiError(409, 'That game already exists for this platform');
  }

  try {
    await db.run(
      `UPDATE gaming_games
       SET name = ?, platform = ?, status = ?, external_id = ?, updated_at = ?
       WHERE id = ?`,
      [next.name, next.platform, next.status, next.externalId, now, gameId]
    );
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE')) {
      throw new ApiError(409, 'That game already exists for this platform');
    }
    throw error;
  }

  return { ...game, ...next, updatedAt: now };
}

export async function deleteParentGame(parentId, gameId) {
  const db = await getDb();
  await findGame(db, parentId, gameId);
  await db.run('DELETE FROM gaming_games WHERE id = ?', [gameId]);
  return { deleted: true };
}

function mapOverview({ settings, pointsBalance, todayUsed, weekUsed }) {
  const minuteRatio = settings.minutesUnit / settings.pointsUnit;
  const minutesBudget = Math.floor(pointsBalance * minuteRatio);
  const remainingByBudget = Math.max(0, minutesBudget - weekUsed);
  const remainingToday = Math.max(0, settings.dailyCapMinutes - todayUsed);
  const remainingWeeklyCap = Math.max(0, settings.weeklyCapMinutes - weekUsed);
  const playableNow = Math.max(0, Math.min(remainingByBudget, remainingToday, remainingWeeklyCap));

  return {
    pointsBalance,
    conversion: {
      pointsUnit: settings.pointsUnit,
      minutesUnit: settings.minutesUnit
    },
    caps: {
      dailyCapMinutes: settings.dailyCapMinutes,
      weeklyCapMinutes: settings.weeklyCapMinutes
    },
    usage: {
      todayUsedMinutes: todayUsed,
      weekUsedMinutes: weekUsed,
      weekBudgetMinutes: minutesBudget,
      remainingByBudget,
      remainingToday,
      remainingWeeklyCap,
      playableNow
    }
  };
}

export async function getChildGamingOverview(parentId, childId) {
  const db = await getDb();
  const settings = await ensureSettings(db, parentId);
  const child = await ensureParentChild(db, parentId, childId);

  const todayStart = getUtcDayStart().toISOString();
  const weekStart = getUtcIsoWeekStart().toISOString();

  const today = await db.get(
    `SELECT COALESCE(SUM(duration_minutes), 0) as minutes
     FROM gaming_sessions
     WHERE parent_id = ? AND child_id = ? AND status = 'Completed' AND started_at >= ?`,
    [parentId, childId, todayStart]
  );

  const week = await db.get(
    `SELECT COALESCE(SUM(duration_minutes), 0) as minutes
     FROM gaming_sessions
     WHERE parent_id = ? AND child_id = ? AND status = 'Completed' AND started_at >= ?`,
    [parentId, childId, weekStart]
  );

  const blockedGames = await db.all(
    `SELECT id, name, platform, status
     FROM gaming_games
     WHERE parent_id = ? AND status = 'Blocked'
     ORDER BY name ASC`,
    [parentId]
  );

  return {
    child: {
      id: childId,
      name: child.name
    },
    ...mapOverview({
      settings,
      pointsBalance: child.pointsBalance,
      todayUsed: Number(today?.minutes || 0),
      weekUsed: Number(week?.minutes || 0)
    }),
    blockedGames
  };
}

function denialPayload(reason, code, extras = {}) {
  const meta = DENIAL_METADATA[code] || {};
  return {
    allowed: false,
    code,
    reason,
    message: reason,
    lockState: meta.lockState || 'LOCKED',
    nextStep: meta.nextStep || 'Ask parent for guidance.',
    ...extras
  };
}

async function recordDeniedSession(db, {
  parentId,
  childId,
  gameId = null,
  gameName,
  platform,
  reason,
  code,
  now
}) {
  const denialId = uuidv4();
  await db.run(
    `INSERT INTO gaming_sessions
      (id, parent_id, child_id, game_id, game_name, platform, status, denial_reason, denial_code, granted_minutes, duration_minutes, started_at, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Denied', ?, ?, 0, 0, ?, 'InApp', ?, ?)`,
    [
      denialId,
      parentId,
      childId,
      gameId,
      sanitizeText(gameName || 'Unknown', 80) || 'Unknown',
      sanitizeText(platform || 'Unknown', 40) || 'Unknown',
      reason,
      code,
      now,
      now,
      now
    ]
  );
  return denialId;
}

export async function startGamingSession(parentId, childId, payload) {
  const db = await getDb();
  await ensureParentChild(db, parentId, childId);
  const settings = await ensureSettings(db, parentId);

  const activeSession = await db.get(
    `SELECT id, game_name as gameName, granted_minutes as grantedMinutes, started_at as startedAt
     FROM gaming_sessions
     WHERE parent_id = ? AND child_id = ? AND status = 'Started'
     ORDER BY started_at DESC
     LIMIT 1`,
    [parentId, childId]
  );
  if (activeSession) {
    const now = new Date().toISOString();
    const denialId = await recordDeniedSession(db, {
      parentId,
      childId,
      gameName: payload.gameName || activeSession.gameName,
      platform: payload.platform || 'Unknown',
      reason: 'Another gaming session is already active',
      code: GAMING_DENIAL_CODES.ACTIVE_SESSION_EXISTS,
      now
    });
    return {
      ...denialPayload(
        'Another gaming session is already active',
        GAMING_DENIAL_CODES.ACTIVE_SESSION_EXISTS,
        { activeSession }
      ),
      sessionId: denialId
    };
  }

  let game = null;
  if (payload.gameId) {
    game = await db.get('SELECT * FROM gaming_games WHERE id = ? AND parent_id = ?', [payload.gameId, parentId]);
    if (!game) throw new ApiError(404, 'Game not found');
  }

  const gameName = sanitizeText(payload.gameName || game?.name, 80);
  const platform = sanitizeText(payload.platform || game?.platform, 40);

  if (!gameName || !platform) {
    throw new ApiError(400, 'gameName/gameId and platform are required');
  }

  const match = game || await db.get(
    'SELECT * FROM gaming_games WHERE parent_id = ? AND LOWER(name) = LOWER(?) AND platform = ?',
    [parentId, gameName, platform]
  );

  const now = new Date().toISOString();
  if (match?.status === 'Blocked') {
    const reason = 'Blocked by parent game controls';
    const denialId = await recordDeniedSession(db, {
      parentId,
      childId,
      gameId: match.id,
      gameName,
      platform,
      reason,
      code: GAMING_DENIAL_CODES.BLOCKED_GAME,
      now
    });

    return {
      ...denialPayload(reason, GAMING_DENIAL_CODES.BLOCKED_GAME),
      sessionId: denialId
    };
  }

  const overview = await getChildGamingOverview(parentId, childId);
  if (overview.usage.playableNow <= 0) {
    const denialCode = overview.usage.remainingToday <= 0
      ? GAMING_DENIAL_CODES.DAILY_CAP_REACHED
      : overview.usage.remainingWeeklyCap <= 0
        ? GAMING_DENIAL_CODES.WEEKLY_CAP_REACHED
        : GAMING_DENIAL_CODES.NO_MINUTES_FROM_POINTS;
    const reason = denialCode === GAMING_DENIAL_CODES.DAILY_CAP_REACHED
      ? 'Daily gaming cap reached'
      : denialCode === GAMING_DENIAL_CODES.WEEKLY_CAP_REACHED
        ? 'Weekly gaming cap reached'
        : 'No gaming minutes available from points';
    const denialId = await recordDeniedSession(db, {
      parentId,
      childId,
      gameId: match?.id ?? null,
      gameName,
      platform,
      reason,
      code: denialCode,
      now
    });

    return {
      ...denialPayload(reason, denialCode),
      sessionId: denialId,
      overview
    };
  }

  const requested = payload.requestedMinutes ?? overview.usage.playableNow;
  const grantedMinutes = Math.max(1, Math.min(requested, overview.usage.playableNow, 240));
  const id = uuidv4();

  try {
    await db.run(
      `INSERT INTO gaming_sessions
        (id, parent_id, child_id, game_id, game_name, platform, status, granted_minutes, duration_minutes, started_at, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Started', ?, 0, ?, 'InApp', ?, ?)`,
      [id, parentId, childId, match?.id ?? null, gameName, platform, grantedMinutes, now, now, now]
    );
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('UNIQUE constraint failed')) {
      const latestActive = await db.get(
        `SELECT id, game_name as gameName, granted_minutes as grantedMinutes, started_at as startedAt
         FROM gaming_sessions
         WHERE parent_id = ? AND child_id = ? AND status = 'Started'
         ORDER BY started_at DESC
         LIMIT 1`,
        [parentId, childId]
      );
      const denialId = await recordDeniedSession(db, {
        parentId,
        childId,
        gameId: match?.id ?? null,
        gameName,
        platform,
        reason: 'Another gaming session is already active',
        code: GAMING_DENIAL_CODES.ACTIVE_SESSION_EXISTS,
        now
      });
      return {
        ...denialPayload(
          'Another gaming session is already active',
          GAMING_DENIAL_CODES.ACTIVE_SESSION_EXISTS,
          { activeSession: latestActive || null }
        ),
        sessionId: denialId
      };
    }
    throw error;
  }

  return {
    allowed: true,
    sessionId: id,
    code: 'ALLOWED',
    lockState: 'UNLOCKED',
    gameName,
    platform,
    requestedMinutes: requested,
    grantedMinutes,
    cappedByControls: grantedMinutes < requested,
    message: grantedMinutes < requested
      ? `Session started with ${grantedMinutes} minutes due to current limits.`
      : `Session started for ${grantedMinutes} minutes.`,
    startsAt: now,
    expiresAt: new Date(Date.parse(now) + grantedMinutes * 60_000).toISOString(),
    conversion: {
      pointsUnit: settings.pointsUnit,
      minutesUnit: settings.minutesUnit
    }
  };
}

export async function endGamingSession(parentId, childId, payload) {
  const db = await getDb();
  await ensureParentChild(db, parentId, childId);

  const session = await db.get(
    `SELECT * FROM gaming_sessions
     WHERE id = ? AND parent_id = ? AND child_id = ?`,
    [payload.sessionId, parentId, childId]
  );

  if (!session) throw new ApiError(404, 'Session not found');
  if (session.status !== 'Started') {
    return {
      ignored: true,
      message: 'Session already closed',
      sessionId: payload.sessionId
    };
  }

  const used = Math.max(1, Math.min(payload.actualMinutes, session.granted_minutes || payload.actualMinutes));
  const now = new Date().toISOString();

  await db.run(
    `UPDATE gaming_sessions
     SET status = 'Completed', duration_minutes = ?, ended_at = ?, updated_at = ?
     WHERE id = ?`,
    [used, now, now, payload.sessionId]
  );

  return {
    ignored: false,
    message: 'Session recorded',
    sessionId: payload.sessionId,
    durationMinutes: used,
    overview: await getChildGamingOverview(parentId, childId)
  };
}

export async function importGamingUsage(parentId, payload) {
  const db = await getDb();
  await ensureParentChild(db, parentId, payload.childId);
  const now = new Date().toISOString();
  let imported = 0;

  await db.exec('BEGIN');
  try {
    for (const entry of payload.entries) {
      const gameName = sanitizeText(entry.gameName, 80);
      const platform = sanitizeText(entry.platform, 40);
      if (!gameName || !platform) continue;
      const startedAtTs = Date.parse(entry.startedAt);
      if (Number.isNaN(startedAtTs)) continue;
      if (startedAtTs > Date.now() + 60_000) {
        throw new ApiError(400, 'Imported usage cannot start in the future');
      }

      const startedAt = entry.startedAt;
      const endedAt = new Date(Date.parse(startedAt) + entry.durationMinutes * 60_000).toISOString();

      await db.run(
        `INSERT INTO gaming_sessions
          (id, parent_id, child_id, game_id, game_name, platform, status, granted_minutes, duration_minutes, started_at, ended_at, source, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, ?, 'Completed', ?, ?, ?, ?, 'Import', ?, ?)`,
        [
          uuidv4(),
          parentId,
          payload.childId,
          gameName,
          platform,
          entry.durationMinutes,
          entry.durationMinutes,
          startedAt,
          endedAt,
          now,
          now
        ]
      );
      imported += 1;
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return {
    imported,
    overview: await getChildGamingOverview(parentId, payload.childId)
  };
}

export async function listGamingSessions(parentId, childId, { limit = 50 } = {}) {
  const db = await getDb();
  await ensureParentChild(db, parentId, childId);
  return db.all(
    `SELECT id, game_name as gameName, platform, status, denial_reason as denialReason, denial_code as denialCode,
            granted_minutes as grantedMinutes, duration_minutes as durationMinutes,
            started_at as startedAt, ended_at as endedAt, source, created_at as createdAt
     FROM gaming_sessions
     WHERE parent_id = ? AND child_id = ?
     ORDER BY started_at DESC
     LIMIT ?`,
    [parentId, childId, limit]
  );
}

export async function listParentGamingAudit(parentId, { childId, status, limit = 80 } = {}) {
  const db = await getDb();
  const args = [parentId];
  const filters = ['gs.parent_id = ?'];

  if (childId) {
    args.push(childId);
    filters.push('gs.child_id = ?');
  }
  if (status) {
    args.push(status);
    filters.push('gs.status = ?');
  }
  args.push(limit);

  return db.all(
    `SELECT gs.id, gs.child_id as childId, cp.name as childName, gs.game_name as gameName, gs.platform, gs.status,
            gs.denial_reason as denialReason, gs.denial_code as denialCode,
            gs.granted_minutes as grantedMinutes, gs.duration_minutes as durationMinutes,
            gs.started_at as startedAt, gs.ended_at as endedAt, gs.source, gs.created_at as createdAt
     FROM gaming_sessions gs
     JOIN child_profiles cp ON cp.id = gs.child_id
     WHERE ${filters.join(' AND ')}
     ORDER BY gs.started_at DESC
     LIMIT ?`,
    args
  );
}

export async function getWeeklyGamingReport(parentId, childId, weekStartIso = null) {
  const db = await getDb();
  const child = await ensureParentChild(db, parentId, childId);
  const settings = await ensureSettings(db, parentId);

  const start = weekStartIso ? getUtcIsoWeekStart(new Date(weekStartIso)) : getUtcIsoWeekStart(new Date());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const sessions = await db.all(
    `SELECT game_name as gameName, platform, duration_minutes as durationMinutes, started_at as startedAt, source
     FROM gaming_sessions
     WHERE parent_id = ?
       AND child_id = ?
       AND status = 'Completed'
       AND started_at >= ?
       AND started_at < ?
     ORDER BY started_at ASC`,
    [parentId, childId, start.toISOString(), end.toISOString()]
  );

  const totalsByGame = new Map();
  const totalsByDay = new Map();
  let totalMinutes = 0;

  for (const session of sessions) {
    totalMinutes += session.durationMinutes;

    const gameKey = `${session.gameName}__${session.platform}`;
    const existingGame = totalsByGame.get(gameKey) || {
      gameName: session.gameName,
      platform: session.platform,
      minutes: 0,
      sessions: 0
    };
    existingGame.minutes += session.durationMinutes;
    existingGame.sessions += 1;
    totalsByGame.set(gameKey, existingGame);

    const day = session.startedAt.slice(0, 10);
    totalsByDay.set(day, (totalsByDay.get(day) || 0) + session.durationMinutes);
  }

  return {
    child: {
      id: childId,
      name: child.name
    },
    week: {
      startsAt: start.toISOString(),
      endsAt: end.toISOString()
    },
    totals: {
      totalMinutes,
      dailyCapMinutes: settings.dailyCapMinutes,
      weeklyCapMinutes: settings.weeklyCapMinutes,
      weeklyCapUsedPercent: settings.weeklyCapMinutes > 0
        ? Math.min(100, Math.round((totalMinutes / settings.weeklyCapMinutes) * 100))
        : 0
    },
    byGame: [...totalsByGame.values()].sort((a, b) => b.minutes - a.minutes),
    byDay: [...totalsByDay.entries()].map(([date, minutes]) => ({ date, minutes })).sort((a, b) => a.date.localeCompare(b.date))
  };
}
