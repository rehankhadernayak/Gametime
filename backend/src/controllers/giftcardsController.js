import {
  createManualGiftcardInventory,
  createRewardFromGiftcardInventory,
  getGiftcardRedemptionDetails,
  getGiftcardWalletBalance,
  handleAthenaWebhookEvent,
  listGiftcardCatalog,
  listGiftcardInventory,
  listGiftcardSkuCatalog,
  listMyGiftcardCodes,
  purchaseGiftcardInventory,
  syncGiftcardInventory
} from '../services/giftcardService.js';
import {
  giftcardCreateRewardSchema,
  giftcardGpPurchaseSchema,
  giftcardGpTransactionsQuerySchema,
  giftcardManualInventorySchema,
  giftcardInventorySyncParamsSchema,
  giftcardPurchaseSchema,
  giftcardRedemptionDetailsParamsSchema,
  giftcardSkuParamsSchema,
  giftcardCatalogQuerySchema
} from '../utils/validation.js';
import { ApiError } from '../utils/errors.js';
import { getDb } from '../db/connection.js';
import {
  getGpSummaryForParent,
  listGpTransactions,
  purchaseParentGp
} from '../services/giftcardPointsService.js';

export async function listGiftcardCatalogController(req, res, next) {
  try {
    const query = giftcardCatalogQuerySchema.parse(req.query);
    return res.json(await listGiftcardCatalog(query));
  } catch (error) {
    next(error);
  }
}

export async function listGiftcardSkusController(req, res, next) {
  try {
    const params = giftcardSkuParamsSchema.parse(req.params);
    const query = giftcardCatalogQuerySchema.parse(req.query);
    return res.json(
      await listGiftcardSkuCatalog({
        giftcardId: params.giftcardId,
        pageNumber: query.pageNumber,
        pageSize: query.pageSize
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function getGiftcardWalletBalanceController(_req, res, next) {
  try {
    return res.json(await getGiftcardWalletBalance());
  } catch (error) {
    next(error);
  }
}

export async function purchaseGiftcardInventoryController(req, res, next) {
  try {
    const payload = giftcardPurchaseSchema.parse(req.body);
    return res.status(201).json(await purchaseGiftcardInventory(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function createManualGiftcardInventoryController(req, res, next) {
  try {
    const payload = giftcardManualInventorySchema.parse(req.body);
    return res.status(201).json(await createManualGiftcardInventory(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function listGiftcardInventoryController(req, res, next) {
  try {
    return res.json(await listGiftcardInventory(req.auth.parentId));
  } catch (error) {
    next(error);
  }
}

export async function syncGiftcardInventoryController(req, res, next) {
  try {
    const params = giftcardInventorySyncParamsSchema.parse(req.params);
    return res.json(await syncGiftcardInventory(req.auth.parentId, params.batchId));
  } catch (error) {
    next(error);
  }
}

export async function createRewardFromGiftcardInventoryController(req, res, next) {
  try {
    const payload = giftcardCreateRewardSchema.parse(req.body);
    return res.status(201).json(await createRewardFromGiftcardInventory(req.auth.parentId, payload));
  } catch (error) {
    next(error);
  }
}

export async function giftcardRedemptionDetailsController(req, res, next) {
  try {
    const params = giftcardRedemptionDetailsParamsSchema.parse(req.params);
    return res.json(await getGiftcardRedemptionDetails(req.auth, params.redemptionId));
  } catch (error) {
    next(error);
  }
}

export async function purchaseGiftcardPointsController(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(403, 'Manual GP purchase is disabled in production. Use Stripe top-up.');
    }
    const payload = giftcardGpPurchaseSchema.parse(req.body);
    return res.status(201).json(await purchaseParentGp({
      parentId: req.auth.parentId,
      points: payload.gpPoints,
      moneyAmount: payload.moneyAmount,
      currency: payload.currency,
      note: payload.note
    }));
  } catch (error) {
    next(error);
  }
}

export async function getGiftcardPointsSummaryController(req, res, next) {
  try {
    if (req.auth.role === 'child') {
      const db = await getDb();
      const child = await db.get(
        `SELECT id,
                name,
                points_balance as rpBalance,
                giftcard_points_balance as gpBalance
         FROM child_profiles
         WHERE id = ? AND parent_id = ?`,
        [req.auth.childId, req.auth.parentId]
      );
      return res.json({
        parentGpBalance: null,
        children: child ? [child] : []
      });
    }
    return res.json(await getGpSummaryForParent(req.auth.parentId));
  } catch (error) {
    next(error);
  }
}

export async function listGiftcardPointsTransactionsController(req, res, next) {
  try {
    const query = giftcardGpTransactionsQuerySchema.parse(req.query || {});
    if (req.auth.role === 'child') {
      return res.json(await listGpTransactions({
        parentId: req.auth.parentId,
        childId: req.auth.childId,
        limit: query.limit
      }));
    }

    let targetChildId = query.childId || null;
    if (targetChildId) {
      const db = await getDb();
      const child = await db.get('SELECT id FROM child_profiles WHERE id = ? AND parent_id = ?', [
        targetChildId,
        req.auth.parentId
      ]);
      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }
    }

    return res.json(await listGpTransactions({
      parentId: req.auth.parentId,
      childId: targetChildId,
      limit: query.limit
    }));
  } catch (error) {
    next(error);
  }
}

export async function listMyGiftcardCodesController(req, res, next) {
  try {
    return res.json(await listMyGiftcardCodes(req.auth.childId));
  } catch (error) {
    next(error);
  }
}

export async function athenaWebhookRawController(req, res, next) {
  try {
    return res.json(
      await handleAthenaWebhookEvent({
        rawBody: req.body,
        headers: req.headers
      })
    );
  } catch (error) {
    next(error);
  }
}
