import {
  createParentGame,
  deleteParentGame,
  endGamingSession,
  getChildGamingOverview,
  getGamingSettings,
  getWeeklyGamingReport,
  importGamingUsage,
  listParentGamingAudit,
  listGamingSessions,
  listParentGames,
  startGamingSession,
  syncDetectedGames,
  updateGamingSettings,
  updateParentGame
} from '../services/gamingService.js';
import {
  gamingGameCreateSchema,
  gamingGameUpdateSchema,
  gamingAuditQuerySchema,
  gamingSessionsQuerySchema,
  gamingSessionEndSchema,
  gamingSessionImportSchema,
  gamingSessionStartSchema,
  gamingSettingsUpdateSchema,
  gamingSyncDetectedSchema,
  gamingWeeklyReportQuerySchema
} from '../utils/validation.js';

export async function getGamingSettingsController(req, res, next) {
  try {
    return res.json(await getGamingSettings(req.auth.parentId));
  } catch (error) {
    next(error);
  }
}

export async function updateGamingSettingsController(req, res, next) {
  try {
    const payload = gamingSettingsUpdateSchema.parse(req.body);
    return res.json(await updateGamingSettings(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function listGamingGamesController(req, res, next) {
  try {
    if (req.auth.role === 'parent') {
      return res.json(await listParentGames(req.auth.parentId));
    }

    const all = await listParentGames(req.auth.parentId);
    return res.json(all.filter((game) => game.status === 'Blocked'));
  } catch (error) {
    next(error);
  }
}

export async function createGamingGameController(req, res, next) {
  try {
    const payload = gamingGameCreateSchema.parse(req.body);
    return res.status(201).json(await createParentGame(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function updateGamingGameController(req, res, next) {
  try {
    const payload = gamingGameUpdateSchema.parse(req.body);
    return res.json(await updateParentGame(req.auth.parentId, req.params.gameId, payload));
  } catch (error) {
    next(error);
  }
}

export async function deleteGamingGameController(req, res, next) {
  try {
    return res.json(await deleteParentGame(req.auth.parentId, req.params.gameId));
  } catch (error) {
    next(error);
  }
}

export async function syncDetectedGamesController(req, res, next) {
  try {
    const payload = gamingSyncDetectedSchema.parse(req.body);
    return res.json(await syncDetectedGames(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function parentChildGamingOverviewController(req, res, next) {
  try {
    return res.json(await getChildGamingOverview(req.auth.parentId, req.params.childId));
  } catch (error) {
    next(error);
  }
}

export async function childGamingOverviewController(req, res, next) {
  try {
    return res.json(await getChildGamingOverview(req.auth.parentId, req.auth.childId));
  } catch (error) {
    next(error);
  }
}

export async function startGamingSessionController(req, res, next) {
  try {
    const payload = gamingSessionStartSchema.parse(req.body);
    const childId = req.auth.role === 'child' ? req.auth.childId : payload.childId;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }
    return res.json(await startGamingSession(req.auth.parentId, childId, payload));
  } catch (error) {
    next(error);
  }
}

export async function endGamingSessionController(req, res, next) {
  try {
    const payload = gamingSessionEndSchema.parse(req.body);
    const childId = req.auth.role === 'child' ? req.auth.childId : payload.childId;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }
    return res.json(await endGamingSession(req.auth.parentId, childId, payload));
  } catch (error) {
    next(error);
  }
}

export async function listGamingSessionsController(req, res, next) {
  try {
    const query = gamingSessionsQuerySchema.parse(req.query);
    const childId = req.auth.role === 'child' ? req.auth.childId : query.childId;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required for parent view' });
    }

    return res.json(await listGamingSessions(req.auth.parentId, childId, { limit: query.limit }));
  } catch (error) {
    next(error);
  }
}

export async function listParentGamingAuditController(req, res, next) {
  try {
    const query = gamingAuditQuerySchema.parse(req.query);
    return res.json(await listParentGamingAudit(req.auth.parentId, query));
  } catch (error) {
    next(error);
  }
}

export async function importGamingUsageController(req, res, next) {
  try {
    const payload = gamingSessionImportSchema.parse(req.body);
    return res.json(await importGamingUsage(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function weeklyGamingReportController(req, res, next) {
  try {
    const query = gamingWeeklyReportQuerySchema.parse(req.query);
    const childId = req.auth.role === 'child' ? req.auth.childId : query.childId;
    if (!childId) {
      return res.status(400).json({ error: 'childId is required for parent view' });
    }

    return res.json(await getWeeklyGamingReport(req.auth.parentId, childId, query.weekStart));
  } catch (error) {
    next(error);
  }
}
