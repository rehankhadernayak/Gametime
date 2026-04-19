import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import {
  decodeAthenaGiftcodes,
  getAthenaOrderStatus,
  getAthenaWalletBalance,
  isAthenaMockMode,
  listAthenaGiftcards,
  listAthenaSkus,
  normalizeAthenaStatus,
  purchaseAthenaGiftcard,
  verifyAthenaWebhookSignature
} from './athenaService.js';
import { decryptString, encryptString, sha256Hex } from './cryptoService.js';

function sanitizeText(value, max = 120) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function normalizeFulfilmentType(value) {
  const normalized = String(value || 'VOUCHER').trim().toUpperCase();
  if (normalized === 'VOUCHER' || normalized === 'TOPUP') return normalized;
  throw new ApiError(400, 'fulfilmentType must be VOUCHER or TOPUP');
}

function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function compactProviderPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const clone = { ...payload };
  delete clone.encryptedgiftcodes;
  delete clone.giftcodes;
  delete clone.iv;
  delete clone.tag;
  return clone;
}

function mapInventoryRow(row) {
  return {
    id: row.id,
    parentId: row.parentId,
    merchantOrderRequestId: row.merchantOrderRequestId,
    athenaOrderId: row.athenaOrderId,
    giftcardId: row.giftcardId,
    giftcardName: row.giftcardName,
    skuId: row.skuId,
    skuName: row.skuName,
    fulfilmentType: row.fulfilmentType,
    currency: row.currency,
    quantityPurchased: row.quantityPurchased,
    quantityAvailable: row.quantityAvailable,
    status: row.status,
    invoiceAmount: row.invoiceAmount,
    providerPayload: safeJsonParse(row.providerPayloadJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reward: row.rewardId
      ? {
          id: row.rewardId,
          title: row.rewardTitle,
          pointsCost: row.rewardPointsCost,
          pointsType: row.rewardPointsType || 'GP',
          quantityLimit: row.rewardQuantityLimit,
          active: Boolean(row.rewardActive)
        }
      : null
  };
}

async function findInventoryBatchById(db, parentId, batchId) {
  const row = await db.get(
    `SELECT b.id,
            b.parent_id as parentId,
            b.merchant_order_request_id as merchantOrderRequestId,
            b.athena_order_id as athenaOrderId,
            b.giftcard_id as giftcardId,
            b.giftcard_name as giftcardName,
            b.sku_id as skuId,
            b.sku_name as skuName,
            b.fulfilment_type as fulfilmentType,
            b.currency,
            b.quantity_purchased as quantityPurchased,
            b.quantity_available as quantityAvailable,
            b.status,
            b.invoice_amount as invoiceAmount,
            b.provider_payload_json as providerPayloadJson,
            b.created_at as createdAt,
            b.updated_at as updatedAt,
            l.reward_id as rewardId,
            r.title as rewardTitle,
            r.points_cost as rewardPointsCost,
            r.points_type as rewardPointsType,
            r.quantity_limit as rewardQuantityLimit,
            r.active as rewardActive
     FROM giftcard_inventory_batches b
     LEFT JOIN reward_giftcard_links l ON l.batch_id = b.id
     LEFT JOIN rewards r ON r.id = l.reward_id
     WHERE b.id = ? AND b.parent_id = ?`,
    [batchId, parentId]
  );

  if (!row) throw new ApiError(404, 'Giftcard inventory batch not found');
  return mapInventoryRow(row);
}

async function refreshBatchAvailability(db, batchId, nowIso = new Date().toISOString()) {
  const counts = await db.get(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END), 0) as availableCount,
       COUNT(*) as totalCount
     FROM giftcard_codes
     WHERE batch_id = ?`,
    [batchId]
  );

  await db.run(
    `UPDATE giftcard_inventory_batches
     SET quantity_available = ?,
         quantity_purchased = CASE WHEN quantity_purchased < ? THEN ? ELSE quantity_purchased END,
         updated_at = ?
     WHERE id = ?`,
    [Number(counts.availableCount || 0), Number(counts.totalCount || 0), Number(counts.totalCount || 0), nowIso, batchId]
  );
}

async function insertGiftcodes(db, batch, giftcodes) {
  const now = new Date().toISOString();
  let inserted = 0;

  for (const giftcode of giftcodes) {
    const code = sanitizeText(giftcode.code, 200);
    if (!code) continue;
    const pin = giftcode.pin ? sanitizeText(giftcode.pin, 50) : null;
    const expiryDate = giftcode.expiryDate ? String(giftcode.expiryDate).slice(0, 32) : null;
    const fingerprint = sha256Hex(`${batch.id}:${code}:${pin || ''}`);

    const result = await db.run(
      `INSERT INTO giftcard_codes
        (id, batch_id, parent_id, code_encrypted, pin_encrypted, code_fingerprint, expiry_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, ?)
       ON CONFLICT(batch_id, code_fingerprint) DO NOTHING`,
      [
        uuidv4(),
        batch.id,
        batch.parentId,
        encryptString(code),
        pin ? encryptString(pin) : null,
        fingerprint,
        expiryDate,
        now,
        now
      ]
    );

    if (result?.changes) inserted += 1;
  }

  await refreshBatchAvailability(db, batch.id, now);
  return inserted;
}

function toAthenaPurchasePayload(payload) {
  const version = String(env.athenaApiVersion || 'v2').toLowerCase();
  const isV3 = version === 'v3';
  const mapped = {
    merchant_order_request_id: payload.merchantOrderRequestId,
    giftcard_id: payload.giftcardId,
    sku_id: payload.skuId,
    quantity: payload.quantity,
    currency: payload.currency || 'INR'
  };

  if (isV3) {
    mapped.fulfilment_type = payload.fulfilmentType;
  }
  if (isV3 && payload.finalPrice !== undefined && payload.finalPrice !== null) {
    mapped.final_price = String(payload.finalPrice);
  }
  if (payload.customerDetails) mapped.customerDetails = payload.customerDetails;
  if (payload.deliveryDetails) mapped.deliveryDetails = payload.deliveryDetails;
  if (Array.isArray(payload.customerDistributionChannels) && payload.customerDistributionChannels.length > 0) {
    mapped.customerDistributionChannels = payload.customerDistributionChannels;
  }

  return mapped;
}

function extractGiftcodesFromProvider(purchaseOrStatusPayload) {
  return decodeAthenaGiftcodes(purchaseOrStatusPayload);
}

function toSlugToken(value, fallback = 'manual') {
  const token = sanitizeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return token || fallback;
}

function normalizeManualGiftcodes(codes) {
  const seen = new Set();
  const normalized = [];

  for (const item of codes || []) {
    const code = sanitizeText(item?.code, 200);
    const pin = item?.pin ? sanitizeText(item.pin, 50) : null;
    const expiryDate = item?.expiryDate ? String(item.expiryDate).slice(0, 32) : null;

    if (!code) {
      throw new ApiError(400, 'Each giftcard code entry must include a code');
    }

    const dedupeKey = `${code}::${pin || ''}`;
    if (seen.has(dedupeKey)) {
      throw new ApiError(400, `Duplicate giftcard code entry detected: ${code}`);
    }
    seen.add(dedupeKey);
    normalized.push({ code, pin, expiryDate });
  }

  if (!normalized.length) {
    throw new ApiError(400, 'At least one giftcard code is required');
  }

  return normalized;
}

export async function listGiftcardCatalog(query) {
  // Athena catalog disabled for MVP launch - use manual giftcard entry instead
  if (!env.athenaEnabled) {
    return { giftcards: [], pageSize: 0, totalResults: 0, pageNumber: 1 };
  }
  return listAthenaGiftcards(query);
}

export async function listGiftcardSkuCatalog(query) {
  // Athena SKU catalog disabled for MVP launch - use manual giftcard entry instead
  if (!env.athenaEnabled) {
    return { skus: [], pageSize: 0, totalResults: 0, pageNumber: 1 };
  }
  return listAthenaSkus(query);
}

export async function getGiftcardWalletBalance() {
  // Athena wallet disabled for MVP launch
  if (!env.athenaEnabled) {
    return { balance: 0, currency: 'SGD' };
  }
  return getAthenaWalletBalance();
}

export async function createManualGiftcardInventory(parentId, payload) {
  const db = await getDb();
  const merchantOrderRequestId = sanitizeText(
    payload.merchantOrderRequestId || `MANUAL-${Date.now()}-${uuidv4().slice(0, 8)}`,
    100
  );
  const giftcodes = normalizeManualGiftcodes(payload.codes);

  const existing = await db.get(
    `SELECT id,
            parent_id as parentId,
            merchant_order_request_id as merchantOrderRequestId,
            athena_order_id as athenaOrderId,
            giftcard_id as giftcardId,
            giftcard_name as giftcardName,
            sku_id as skuId,
            sku_name as skuName,
            fulfilment_type as fulfilmentType,
            currency,
            quantity_purchased as quantityPurchased,
            quantity_available as quantityAvailable,
            status,
            invoice_amount as invoiceAmount,
            provider_payload_json as providerPayloadJson,
            created_at as createdAt,
            updated_at as updatedAt,
            NULL as rewardId,
            NULL as rewardTitle,
            NULL as rewardPointsCost,
            NULL as rewardPointsType,
            NULL as rewardQuantityLimit,
            NULL as rewardActive
     FROM giftcard_inventory_batches
     WHERE parent_id = ? AND merchant_order_request_id = ?`,
    [parentId, merchantOrderRequestId]
  );

  if (existing) {
    return {
      ...mapInventoryRow(existing),
      source: 'manual',
      idempotent: true,
      insertedCodes: 0
    };
  }

  const now = new Date().toISOString();
  const giftcardName = sanitizeText(payload.giftcardName, 120);
  const skuName = sanitizeText(payload.skuName, 120);
  const batch = {
    id: uuidv4(),
    parentId,
    merchantOrderRequestId,
    athenaOrderId: null,
    giftcardId: sanitizeText(payload.giftcardId || `manual-${toSlugToken(giftcardName, 'giftcard')}`, 120),
    giftcardName,
    skuId: sanitizeText(payload.skuId || `manual-${toSlugToken(skuName, 'sku')}`, 120),
    skuName,
    fulfilmentType: 'VOUCHER',
    currency: sanitizeText(payload.currency || 'SGD', 12),
    quantityPurchased: giftcodes.length,
    quantityAvailable: 0,
    status: 'completed',
    invoiceAmount: payload.purchaseAmount === undefined || payload.purchaseAmount === null
      ? null
      : String(payload.purchaseAmount).slice(0, 40),
    providerPayloadJson: JSON.stringify({
      source: 'manual',
      store: sanitizeText(payload.store || 'Amazon', 80) || 'Amazon',
      purchaseReference: payload.purchaseReference ? sanitizeText(payload.purchaseReference, 120) : null,
      note: payload.note ? sanitizeText(payload.note, 200) : null
    })
  };

  await db.exec('BEGIN');
  try {
    await db.run(
      `INSERT INTO giftcard_inventory_batches
        (id, parent_id, merchant_order_request_id, athena_order_id, giftcard_id, giftcard_name,
         sku_id, sku_name, fulfilment_type, currency, quantity_purchased, quantity_available,
         status, invoice_amount, provider_payload_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batch.id,
        batch.parentId,
        batch.merchantOrderRequestId,
        null,
        batch.giftcardId,
        batch.giftcardName,
        batch.skuId,
        batch.skuName,
        batch.fulfilmentType,
        batch.currency,
        batch.quantityPurchased,
        0,
        batch.status,
        batch.invoiceAmount,
        batch.providerPayloadJson,
        now,
        now
      ]
    );

    const insertedCodes = await insertGiftcodes(db, batch, giftcodes);
    await refreshBatchAvailability(db, batch.id, now);
    await db.exec('COMMIT');

    return {
      ...(await findInventoryBatchById(db, parentId, batch.id)),
      source: 'manual',
      idempotent: false,
      insertedCodes
    };
  } catch (error) {
    await db.exec('ROLLBACK');
    const message = String(error?.message || '');
    if (message.includes('giftcard_inventory_batches.parent_id') && message.includes('merchant_order_request_id')) {
      const dupe = await db.get(
        `SELECT id,
                parent_id as parentId,
                merchant_order_request_id as merchantOrderRequestId,
                athena_order_id as athenaOrderId,
                giftcard_id as giftcardId,
                giftcard_name as giftcardName,
                sku_id as skuId,
                sku_name as skuName,
                fulfilment_type as fulfilmentType,
                currency,
                quantity_purchased as quantityPurchased,
                quantity_available as quantityAvailable,
                status,
                invoice_amount as invoiceAmount,
                provider_payload_json as providerPayloadJson,
                created_at as createdAt,
                updated_at as updatedAt,
                NULL as rewardId,
                NULL as rewardTitle,
                NULL as rewardPointsCost,
                NULL as rewardPointsType,
                NULL as rewardQuantityLimit,
                NULL as rewardActive
         FROM giftcard_inventory_batches
         WHERE parent_id = ? AND merchant_order_request_id = ?`,
        [parentId, merchantOrderRequestId]
      );
      if (dupe) {
        return {
          ...mapInventoryRow(dupe),
          source: 'manual',
          idempotent: true,
          insertedCodes: 0
        };
      }
    }
    throw error;
  }
}

export async function purchaseGiftcardInventory(parentId, payload) {
  const db = await getDb();
  const fulfilmentType = normalizeFulfilmentType(payload.fulfilmentType || 'VOUCHER');

  if (fulfilmentType !== 'VOUCHER') {
    throw new ApiError(400, 'Only VOUCHER fulfilment is currently supported for child reward redemptions');
  }

  const merchantOrderRequestId = sanitizeText(payload.merchantOrderRequestId || uuidv4(), 100);
  const existing = await db.get(
    `SELECT id,
            parent_id as parentId,
            merchant_order_request_id as merchantOrderRequestId,
            athena_order_id as athenaOrderId,
            giftcard_id as giftcardId,
            giftcard_name as giftcardName,
            sku_id as skuId,
            sku_name as skuName,
            fulfilment_type as fulfilmentType,
            currency,
            quantity_purchased as quantityPurchased,
            quantity_available as quantityAvailable,
            status,
            invoice_amount as invoiceAmount,
            provider_payload_json as providerPayloadJson,
            created_at as createdAt,
            updated_at as updatedAt,
            NULL as rewardId,
            NULL as rewardTitle,
            NULL as rewardPointsCost,
            NULL as rewardPointsType,
            NULL as rewardQuantityLimit,
            NULL as rewardActive
     FROM giftcard_inventory_batches
     WHERE parent_id = ? AND merchant_order_request_id = ?`,
    [parentId, merchantOrderRequestId]
  );

  if (existing) {
    return {
      ...mapInventoryRow(existing),
      source: isAthenaMockMode() ? 'mock' : 'athena',
      idempotent: true,
      insertedCodes: 0
    };
  }

  const purchaseResponse = await purchaseAthenaGiftcard(
    toAthenaPurchasePayload({
      ...payload,
      merchantOrderRequestId,
      fulfilmentType
    })
  );

  const now = new Date().toISOString();
  const batch = {
    id: uuidv4(),
    parentId,
    merchantOrderRequestId,
    athenaOrderId: sanitizeText(purchaseResponse.order_id || '', 120) || null,
    giftcardId: sanitizeText(payload.giftcardId, 120),
    giftcardName: sanitizeText(payload.giftcardName || purchaseResponse.giftcard_name || payload.giftcardId, 120),
    skuId: sanitizeText(payload.skuId, 120),
    skuName: sanitizeText(payload.skuName || purchaseResponse.sku_name || payload.skuId, 120),
    fulfilmentType,
    currency: sanitizeText(payload.currency || 'INR', 12),
    quantityPurchased: Number(payload.quantity),
    quantityAvailable: 0,
    status: normalizeAthenaStatus(purchaseResponse.status),
    invoiceAmount: purchaseResponse.invoice_amount ? String(purchaseResponse.invoice_amount) : null,
    providerPayloadJson: JSON.stringify(compactProviderPayload(purchaseResponse) || {})
  };

  await db.exec('BEGIN');
  try {
    await db.run(
      `INSERT INTO giftcard_inventory_batches
        (id, parent_id, merchant_order_request_id, athena_order_id, giftcard_id, giftcard_name,
         sku_id, sku_name, fulfilment_type, currency, quantity_purchased, quantity_available,
         status, invoice_amount, provider_payload_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batch.id,
        batch.parentId,
        batch.merchantOrderRequestId,
        batch.athenaOrderId,
        batch.giftcardId,
        batch.giftcardName,
        batch.skuId,
        batch.skuName,
        batch.fulfilmentType,
        batch.currency,
        batch.quantityPurchased,
        0,
        batch.status,
        batch.invoiceAmount,
        batch.providerPayloadJson,
        now,
        now
      ]
    );

    let insertedCodes = 0;
    if (batch.status === 'completed' && batch.fulfilmentType === 'VOUCHER') {
      const giftcodes = extractGiftcodesFromProvider(purchaseResponse);
      insertedCodes = await insertGiftcodes(db, batch, giftcodes);
    }

    await refreshBatchAvailability(db, batch.id);
    await db.exec('COMMIT');

    return {
      ...(await findInventoryBatchById(db, parentId, batch.id)),
      source: isAthenaMockMode() ? 'mock' : 'athena',
      idempotent: false,
      insertedCodes
    };
  } catch (error) {
    await db.exec('ROLLBACK');
    const message = String(error?.message || '');
    if (message.includes('giftcard_inventory_batches.parent_id') && message.includes('merchant_order_request_id')) {
      const dupe = await db.get(
        `SELECT id,
                parent_id as parentId,
                merchant_order_request_id as merchantOrderRequestId,
                athena_order_id as athenaOrderId,
                giftcard_id as giftcardId,
                giftcard_name as giftcardName,
                sku_id as skuId,
                sku_name as skuName,
                fulfilment_type as fulfilmentType,
                currency,
                quantity_purchased as quantityPurchased,
                quantity_available as quantityAvailable,
                status,
                invoice_amount as invoiceAmount,
                provider_payload_json as providerPayloadJson,
                created_at as createdAt,
                updated_at as updatedAt,
                NULL as rewardId,
                NULL as rewardTitle,
                NULL as rewardPointsCost,
                NULL as rewardPointsType,
                NULL as rewardQuantityLimit,
                NULL as rewardActive
         FROM giftcard_inventory_batches
         WHERE parent_id = ? AND merchant_order_request_id = ?`,
        [parentId, merchantOrderRequestId]
      );

      if (dupe) {
        return {
          ...mapInventoryRow(dupe),
          source: isAthenaMockMode() ? 'mock' : 'athena',
          idempotent: true,
          insertedCodes: 0
        };
      }
    }
    throw error;
  }
}

export async function listGiftcardInventory(parentId) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT b.id,
            b.parent_id as parentId,
            b.merchant_order_request_id as merchantOrderRequestId,
            b.athena_order_id as athenaOrderId,
            b.giftcard_id as giftcardId,
            b.giftcard_name as giftcardName,
            b.sku_id as skuId,
            b.sku_name as skuName,
            b.fulfilment_type as fulfilmentType,
            b.currency,
            b.quantity_purchased as quantityPurchased,
            b.quantity_available as quantityAvailable,
            b.status,
            b.invoice_amount as invoiceAmount,
            b.provider_payload_json as providerPayloadJson,
            b.created_at as createdAt,
            b.updated_at as updatedAt,
            l.reward_id as rewardId,
            r.title as rewardTitle,
            r.points_cost as rewardPointsCost,
            r.points_type as rewardPointsType,
            r.quantity_limit as rewardQuantityLimit,
            r.active as rewardActive
     FROM giftcard_inventory_batches b
     LEFT JOIN reward_giftcard_links l ON l.batch_id = b.id
     LEFT JOIN rewards r ON r.id = l.reward_id
     WHERE b.parent_id = ?
     ORDER BY b.created_at DESC`,
    [parentId]
  );

  return rows.map(mapInventoryRow);
}

export async function syncGiftcardInventory(parentId, batchId) {
  const db = await getDb();
  const current = await findInventoryBatchById(db, parentId, batchId);

  if (!current.athenaOrderId && !current.merchantOrderRequestId) {
    throw new ApiError(400, 'Cannot sync this batch: missing provider identifiers');
  }

  const statusResponse = await getAthenaOrderStatus({
    orderId: current.athenaOrderId,
    merchantOrderRequestId: current.merchantOrderRequestId
  });

  const status = normalizeAthenaStatus(statusResponse.status);
  const now = new Date().toISOString();

  await db.exec('BEGIN');
  try {
    await db.run(
      `UPDATE giftcard_inventory_batches
       SET status = ?,
           athena_order_id = COALESCE(?, athena_order_id),
           invoice_amount = COALESCE(?, invoice_amount),
           provider_payload_json = ?,
           updated_at = ?
       WHERE id = ? AND parent_id = ?`,
      [
        status,
        statusResponse.order_id ? String(statusResponse.order_id) : null,
        statusResponse.invoice_amount ? String(statusResponse.invoice_amount) : null,
        JSON.stringify(compactProviderPayload(statusResponse) || {}),
        now,
        batchId,
        parentId
      ]
    );

    let insertedCodes = 0;
    if (status === 'completed' && current.fulfilmentType === 'VOUCHER') {
      const giftcodes = extractGiftcodesFromProvider(statusResponse);
      insertedCodes = await insertGiftcodes(db, { id: batchId, parentId }, giftcodes);
    }

    await refreshBatchAvailability(db, batchId, now);
    await db.exec('COMMIT');

    return {
      ...(await findInventoryBatchById(db, parentId, batchId)),
      source: isAthenaMockMode() ? 'mock' : 'athena',
      insertedCodes,
      synced: true
    };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function createRewardFromGiftcardInventory(parentId, payload) {
  const db = await getDb();
  const batch = await findInventoryBatchById(db, parentId, payload.batchId);

  if (batch.fulfilmentType !== 'VOUCHER') {
    throw new ApiError(400, 'Only VOUCHER inventory can be converted into in-app rewards');
  }
  if (batch.status !== 'completed') {
    throw new ApiError(400, 'Giftcard inventory batch is not completed yet');
  }
  if (batch.quantityAvailable <= 0) {
    throw new ApiError(400, 'Giftcard inventory batch is out of stock');
  }

  const alreadyLinked = await db.get('SELECT reward_id as rewardId FROM reward_giftcard_links WHERE batch_id = ?', [batch.id]);
  if (alreadyLinked) {
    throw new ApiError(409, 'A reward is already linked to this giftcard inventory batch');
  }

  const title = sanitizeText(payload.title || `${batch.giftcardName} - ${batch.skuName}`, 50);
  if (!title) throw new ApiError(400, 'Reward title cannot be empty');

  const requestedLimit = payload.quantityLimit ?? batch.quantityAvailable;
  if (requestedLimit < 1) {
    throw new ApiError(400, 'quantityLimit must be at least 1');
  }
  if (requestedLimit > batch.quantityAvailable) {
    throw new ApiError(400, 'quantityLimit cannot exceed available giftcard stock');
  }

  const now = new Date().toISOString();
  const rewardId = uuidv4();

  await db.exec('BEGIN');
  try {
    await db.run(
      `INSERT INTO rewards (id, parent_id, title, points_cost, points_type, quantity_limit, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'GP', ?, ?, ?, ?)`,
      [rewardId, parentId, title, payload.pointsCost, requestedLimit, payload.active ? 1 : 0, now, now]
    );

    await db.run(
      `INSERT INTO reward_giftcard_links (reward_id, batch_id, auto_fulfill, created_at, updated_at)
       VALUES (?, ?, 1, ?, ?)`,
      [rewardId, batch.id, now, now]
    );

    await db.exec('COMMIT');
    return {
      rewardId,
      batchId: batch.id,
      title,
      pointsCost: payload.pointsCost,
      pointsType: 'GP',
      quantityLimit: requestedLimit,
      active: Boolean(payload.active)
    };
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function redeemLinkedGiftcardReward({ dbClient, childId, reward }) {
  const db = dbClient || (await getDb());
  const link = await db.get(
    `SELECT l.batch_id as batchId,
            l.auto_fulfill as autoFulfill,
            b.giftcard_name as giftcardName,
            b.sku_name as skuName,
            b.quantity_available as batchQuantityAvailable
     FROM reward_giftcard_links l
     JOIN giftcard_inventory_batches b ON b.id = l.batch_id
     WHERE l.reward_id = ?`,
    [reward.id]
  );

  if (!link) return null;
  if (!link.autoFulfill) return null;

  if (Number(link.batchQuantityAvailable || 0) <= 0) {
    throw new ApiError(400, 'Reward is out of stock');
  }

  const codeRow = await db.get(
    `SELECT id
     FROM giftcard_codes
     WHERE batch_id = ? AND status = 'Available'
     ORDER BY created_at ASC
     LIMIT 1`,
    [link.batchId]
  );
  if (!codeRow) {
    throw new ApiError(400, 'Reward is out of stock');
  }

  const now = new Date().toISOString();
  const redemptionId = uuidv4();

  if (reward.quantity_limit !== null) {
    const rewardUpdate = await db.run(
      `UPDATE rewards
       SET quantity_limit = quantity_limit - 1,
           updated_at = ?
       WHERE id = ? AND quantity_limit > 0`,
      [now, reward.id]
    );
    if (!rewardUpdate?.changes) {
      throw new ApiError(400, 'Reward is out of stock');
    }
  }

  const batchUpdate = await db.run(
    `UPDATE giftcard_inventory_batches
     SET quantity_available = quantity_available - 1,
         updated_at = ?
     WHERE id = ? AND quantity_available > 0`,
    [now, link.batchId]
  );
  if (!batchUpdate?.changes) {
    throw new ApiError(400, 'Reward is out of stock');
  }

  const assignResult = await db.run(
    `UPDATE giftcard_codes
     SET status = 'Assigned',
         assigned_redemption_id = ?,
         assigned_child_id = ?,
         assigned_at = ?,
         updated_at = ?
     WHERE id = ? AND status = 'Available'`,
    [redemptionId, childId, now, now, codeRow.id]
  );
  if (!assignResult?.changes) {
    throw new ApiError(400, 'Reward is out of stock');
  }

  await db.run(
    `INSERT INTO redemptions (id, child_id, reward_id, redeemed_at, points_spent, points_type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'Fulfilled', ?, ?)`,
    [redemptionId, childId, reward.id, now, reward.points_cost, reward.points_type || 'GP', now, now]
  );

  return {
    redemptionId,
    batchId: link.batchId,
    giftcardName: link.giftcardName,
    skuName: link.skuName,
    autoFulfilled: true
  };
}

export async function getGiftcardRedemptionDetails(auth, redemptionId) {
  const db = await getDb();
  const details = await db.get(
    `SELECT rd.id as redemptionId,
            rd.child_id as childId,
            rd.redeemed_at as redeemedAt,
            rd.status as redemptionStatus,
            rw.parent_id as parentId,
            rw.title as rewardTitle,
            c.name as childName,
            gc.code_encrypted as codeEncrypted,
            gc.pin_encrypted as pinEncrypted,
            gc.expiry_date as expiryDate,
            b.giftcard_name as giftcardName,
            b.sku_name as skuName,
            b.currency
     FROM redemptions rd
     JOIN rewards rw ON rw.id = rd.reward_id
     JOIN child_profiles c ON c.id = rd.child_id
     JOIN giftcard_codes gc ON gc.assigned_redemption_id = rd.id
     JOIN giftcard_inventory_batches b ON b.id = gc.batch_id
     WHERE rd.id = ?`,
    [redemptionId]
  );

  if (!details) {
    throw new ApiError(404, 'Giftcard redemption details not found');
  }

  if (auth.role === 'parent') {
    if (details.parentId !== auth.parentId) {
      throw new ApiError(404, 'Giftcard redemption details not found');
    }
  } else if (auth.role === 'child') {
    if (details.childId !== auth.childId || details.parentId !== auth.parentId) {
      throw new ApiError(404, 'Giftcard redemption details not found');
    }
  } else {
    throw new ApiError(403, 'Authentication required');
  }

  return {
    redemptionId: details.redemptionId,
    rewardTitle: details.rewardTitle,
    giftcardName: details.giftcardName,
    skuName: details.skuName,
    child: {
      id: details.childId,
      name: details.childName
    },
    redeemedAt: details.redeemedAt,
    expiryDate: details.expiryDate,
    code: decryptString(details.codeEncrypted),
    pin: details.pinEncrypted ? decryptString(details.pinEncrypted) : null,
    currency: details.currency,
    status: details.redemptionStatus
  };
}

export async function listMyGiftcardCodes(childId) {
  const db = await getDb();
  const rows = await db.all(
    `SELECT gc.id,
            gc.code_encrypted as codeEncrypted,
            gc.pin_encrypted as pinEncrypted,
            gc.expiry_date as expiryDate,
            gc.assigned_at as assignedAt,
            gc.assigned_redemption_id as redemptionId,
            rw.title as rewardTitle,
            b.giftcard_name as giftcardName,
            b.sku_name as skuName
     FROM giftcard_codes gc
     LEFT JOIN redemptions rd ON rd.id = gc.assigned_redemption_id
     LEFT JOIN rewards rw ON rw.id = rd.reward_id
     LEFT JOIN giftcard_inventory_batches b ON b.id = gc.batch_id
     WHERE gc.assigned_child_id = ?
       AND gc.status = 'Assigned'
     ORDER BY gc.assigned_at DESC`,
    [childId]
  );

  return rows.map((row) => ({
    id: row.id,
    redemptionId: row.redemptionId,
    rewardTitle: row.rewardTitle || 'Gift Card',
    giftcardName: row.giftcardName || null,
    skuName: row.skuName || null,
    code: decryptString(row.codeEncrypted),
    pin: row.pinEncrypted ? decryptString(row.pinEncrypted) : null,
    expiryDate: row.expiryDate || null,
    assignedAt: row.assignedAt
  }));
}

export async function handleAthenaWebhookEvent({ rawBody, headers = {} }) {
  const raw = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '{}');
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    throw new ApiError(400, 'Invalid webhook payload JSON');
  }

  const signatureHeader = headers['webhook-signature'];
  const eventId = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const shouldVerify = Boolean(String(env.athenaWebhookSecret || '').trim());

  if (shouldVerify && !verifyAthenaWebhookSignature({ rawBody: raw, signatureHeader, eventId, timestamp })) {
    throw new ApiError(401, 'Invalid webhook signature');
  }

  const merchantOrderRequestId =
    payload.merchant_order_request_id || payload.merchantOrderRequestId || payload.merchant_id || null;
  const orderId = payload.order_id || payload.orderId || null;

  if (!merchantOrderRequestId && !orderId) {
    return {
      received: true,
      verified: shouldVerify,
      processedBatches: 0,
      syncedBatchIds: []
    };
  }

  const db = await getDb();
  let batches = [];
  if (merchantOrderRequestId) {
    batches = await db.all(
      'SELECT id, parent_id as parentId FROM giftcard_inventory_batches WHERE merchant_order_request_id = ?',
      [String(merchantOrderRequestId)]
    );
  }
  if (!batches.length && orderId) {
    batches = await db.all(
      'SELECT id, parent_id as parentId FROM giftcard_inventory_batches WHERE athena_order_id = ?',
      [String(orderId)]
    );
  }

  const syncedBatchIds = [];
  for (const batch of batches) {
    await syncGiftcardInventory(batch.parentId, batch.id);
    syncedBatchIds.push(batch.id);
  }

  return {
    received: true,
    verified: shouldVerify,
    processedBatches: syncedBatchIds.length,
    syncedBatchIds,
    eventType: payload.eventType || null
  };
}
