import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import { decryptHexCiphertext, encryptHexCiphertext } from './cryptoService.js';

const MOCK_GIFTCARDS = [
  {
    id: 'mock-steam',
    name: 'Steam Voucher',
    description: 'Steam wallet voucher',
    overallDiscount: 8,
    status: 'active',
    image: 'https://example.com/steam.png'
  },
  {
    id: 'mock-valorant',
    name: 'Valorant Points',
    description: 'Valorant prepaid giftcard',
    overallDiscount: 5,
    status: 'active',
    image: 'https://example.com/valorant.png'
  }
];

const MOCK_SKUS = {
  'mock-steam': [
    { sku_id: 'mock-steam-150', name: 'Steam 150', denomination: '150.00', fulfilment_type: 'VOUCHER', status: 'active' },
    { sku_id: 'mock-steam-500', name: 'Steam 500', denomination: '500.00', fulfilment_type: 'VOUCHER', status: 'active' }
  ],
  'mock-valorant': [
    { sku_id: 'mock-valorant-475', name: 'Valorant 475 VP', denomination: '449.00', fulfilment_type: 'VOUCHER', status: 'active' },
    { sku_id: 'mock-valorant-1000', name: 'Valorant 1000 VP', denomination: '899.00', fulfilment_type: 'VOUCHER', status: 'active' }
  ]
};

const mockOrdersByMerchantId = new Map();
const mockOrdersByOrderId = new Map();

function toApiVersion() {
  const raw = String(env.athenaApiVersion || 'v2').trim().toLowerCase();
  if (raw === 'v1' || raw === 'v2' || raw === 'v3') return raw;
  return 'v2';
}

function toApiPath(pathname, forcedVersion = null) {
  const version = forcedVersion || toApiVersion();
  return `/api/${version}${pathname}`;
}

function normalizeAthenaStatus(value) {
  const status = String(value || '').toLowerCase();
  if (status === 'completed' || status === 'processing' || status === 'failed' || status === 'cancelled') {
    return status;
  }
  if (status === 'partial_completed') return 'completed';
  return 'processing';
}

export function isAthenaMockMode() {
  return env.athenaMockMode || !env.athenaEnabled || !env.athenaApiKey || !env.athenaPartnerId;
}

function normalizeGiftcodes(rawItems) {
  return (Array.isArray(rawItems) ? rawItems : [])
    .map((item) => {
      const code = String(item?.code || '').trim();
      const pin = item?.pin ? String(item.pin).trim() : null;
      const expiryDate = item?.expiryDate ? String(item.expiryDate).trim() : null;
      if (!code) return null;
      return { code, pin, expiryDate };
    })
    .filter(Boolean);
}

function parseJsonOrNull(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function athenaRequest(method, pathname, { query = null, body = null } = {}) {
  if (isAthenaMockMode()) {
    return mockAthenaRequest(method, pathname, { query, body });
  }

  const baseUrl = String(env.athenaBaseUrl || '').trim();
  if (!baseUrl) {
    throw new ApiError(500, 'ATHENA_BASE_URL is required when mock mode is disabled');
  }

  const url = new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, env.athenaTimeoutMs || 15000));

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${env.athenaApiKey}`,
        partnerid: env.athenaPartnerId,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const rawText = await response.text();
    const parsed = parseJsonOrNull(rawText) || {};

    if (!response.ok) {
      const providerError = parsed?.error || parsed;
      const message =
        providerError?.message ||
        providerError?.error ||
        `Athena request failed with status ${response.status}`;
      throw new ApiError(response.status >= 500 ? 502 : 400, message, providerError);
    }

    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === 'AbortError') {
      throw new ApiError(504, 'Athena request timed out');
    }
    throw new ApiError(502, 'Failed to reach Athena provider', { cause: String(error?.message || error) });
  } finally {
    clearTimeout(timeout);
  }
}

function paginate(items, pageNumber, pageSize) {
  const page = Math.max(0, Number(pageNumber || 0));
  const size = Math.min(100, Math.max(1, Number(pageSize || 20)));
  const start = page * size;
  const paged = items.slice(start, start + size);
  return {
    items: paged,
    pagination: {
      total: items.length,
      page,
      pageSize: size,
      totalPages: Math.ceil(items.length / size) || 1
    }
  };
}

function mockAthenaRequest(method, pathname, { query = null, body = null } = {}) {
  if (method === 'GET' && pathname.endsWith('/giftcards')) {
    const brand = String(query?.brand || '').trim().toLowerCase();
    const filtered = brand
      ? MOCK_GIFTCARDS.filter((item) => item.name.toLowerCase().includes(brand))
      : MOCK_GIFTCARDS;
    const { items, pagination } = paginate(filtered, query?.pageNumber ?? query?.page ?? 0, query?.pageSize ?? 20);
    return { giftcards: items, pagination };
  }

  if (method === 'GET' && /\/giftcards\/[^/]+\/skus$/.test(pathname)) {
    const giftcardId = pathname.split('/').slice(-2)[0];
    const skus = MOCK_SKUS[giftcardId] || [];
    const { items, pagination } = paginate(skus, query?.pageNumber ?? query?.page ?? 0, query?.pageSize ?? 20);
    return { skus: items, pagination };
  }

  if (method === 'GET' && pathname.endsWith('/wallet-balance')) {
    return {
      balance: '50000.00',
      partnerName: 'Gametime Sandbox'
    };
  }

  if (method === 'POST' && pathname.endsWith('/giftcard/purchase')) {
    const merchantOrderRequestId = String(body?.merchant_order_request_id || '').trim() || uuidv4();
    if (mockOrdersByMerchantId.has(merchantOrderRequestId)) {
      return mockOrdersByMerchantId.get(merchantOrderRequestId);
    }

    const giftcardId = String(body?.giftcard_id || '').trim();
    const skuId = String(body?.sku_id || '').trim();
    const quantity = Number(body?.quantity || 0);
    const fulfilmentType = String(body?.fulfilment_type || 'VOUCHER').toUpperCase();

    const giftcard = MOCK_GIFTCARDS.find((item) => item.id === giftcardId);
    if (!giftcard) {
      throw new ApiError(400, 'Mock provider: invalid giftcard_id');
    }
    const sku = (MOCK_SKUS[giftcardId] || []).find((item) => item.sku_id === skuId);
    if (!sku) {
      throw new ApiError(400, 'Mock provider: invalid sku_id');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(400, 'Mock provider: quantity must be at least 1');
    }

    const orderId = `MOCK-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const response = {
      merchant_order_request_id: merchantOrderRequestId,
      order_id: orderId,
      status: 'completed',
      fulfilment_type: fulfilmentType,
      invoice_amount: (Number.parseFloat(sku.denomination || '0') * quantity).toFixed(2),
      giftcard_id: giftcardId,
      giftcard_name: giftcard.name,
      sku_id: skuId,
      sku_name: sku.name,
      quantity
    };

    if (fulfilmentType === 'VOUCHER') {
      const giftcodes = Array.from({ length: quantity }, (_, index) => ({
        code: `${giftcard.name.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}-${index + 1}`,
        pin: `${Math.floor(1000 + Math.random() * 9000)}`,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
      }));

      if (env.athenaGiftcodeSecret) {
        const encrypted = encryptHexCiphertext(JSON.stringify(giftcodes), env.athenaGiftcodeSecret);
        response.encryptedgiftcodes = encrypted.ciphertextHex;
        response.iv = encrypted.ivHex;
        response.tag = encrypted.tagHex;
      } else {
        response.giftcodes = giftcodes;
      }
    }

    mockOrdersByMerchantId.set(merchantOrderRequestId, response);
    mockOrdersByOrderId.set(orderId, response);
    return response;
  }

  if (method === 'GET' && pathname.endsWith('/orders')) {
    const merchantOrderRequestId = String(query?.merchant_order_request_id || '').trim();
    const orderId = String(query?.order_id || '').trim();

    if (merchantOrderRequestId && mockOrdersByMerchantId.has(merchantOrderRequestId)) {
      return mockOrdersByMerchantId.get(merchantOrderRequestId);
    }
    if (orderId && mockOrdersByOrderId.has(orderId)) {
      return mockOrdersByOrderId.get(orderId);
    }

    throw new ApiError(404, 'Mock provider: order not found');
  }

  throw new ApiError(404, `Mock provider: unsupported endpoint ${method} ${pathname}`);
}

export async function listAthenaGiftcards({ brand = null, pageNumber = 0, pageSize = 20 } = {}) {
  const result = await athenaRequest('GET', toApiPath('/giftcards'), {
    query: { brand, pageNumber, pageSize }
  });

  return {
    source: isAthenaMockMode() ? 'mock' : 'athena',
    giftcards: result.giftcards || [],
    pagination: result.pagination || null
  };
}

export async function listAthenaSkus({ giftcardId, pageNumber = 0, pageSize = 20 } = {}) {
  const result = await athenaRequest('GET', toApiPath(`/giftcards/${encodeURIComponent(giftcardId)}/skus`), {
    query: {
      page: pageNumber,
      pageNumber,
      pageSize
    }
  });

  return {
    source: isAthenaMockMode() ? 'mock' : 'athena',
    skus: result.skus || [],
    pagination: result.pagination || null
  };
}

export async function getAthenaWalletBalance() {
  const version = toApiVersion();
  const walletVersion = version === 'v1' ? 'v1' : 'v2';
  const result = await athenaRequest('GET', toApiPath('/wallet-balance', walletVersion));

  return {
    source: isAthenaMockMode() ? 'mock' : 'athena',
    balance: result.balance,
    partnerName: result.partnerName
  };
}

export async function purchaseAthenaGiftcard(payload) {
  const version = toApiVersion();
  return athenaRequest('POST', toApiPath('/giftcard/purchase', version), { body: payload });
}

export async function getAthenaOrderStatus({ orderId = null, merchantOrderRequestId = null } = {}) {
  const version = toApiVersion();
  return athenaRequest('GET', toApiPath('/orders', version), {
    query: {
      order_id: orderId,
      merchant_order_request_id: merchantOrderRequestId
    }
  });
}

export function decodeAthenaGiftcodes(payload) {
  if (Array.isArray(payload?.giftcodes)) {
    return normalizeGiftcodes(payload.giftcodes);
  }

  if (!payload?.encryptedgiftcodes) {
    return [];
  }

  if (!payload?.iv || !payload?.tag) {
    throw new ApiError(502, 'Provider response missing iv/tag for giftcode decryption');
  }

  if (!env.athenaGiftcodeSecret) {
    throw new ApiError(500, 'ATHENA_GIFTCODE_SECRET is required to decrypt provider giftcodes');
  }

  const decrypted = decryptHexCiphertext(
    {
      ciphertextHex: String(payload.encryptedgiftcodes),
      ivHex: String(payload.iv),
      tagHex: String(payload.tag)
    },
    env.athenaGiftcodeSecret
  );

  let parsed;
  try {
    parsed = JSON.parse(decrypted);
  } catch {
    throw new ApiError(502, 'Provider giftcode payload is not valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new ApiError(502, 'Provider giftcode payload has invalid shape');
  }

  return normalizeGiftcodes(parsed);
}

function extractSignature(signatureHeader) {
  const match = String(signatureHeader || '').match(/^v1=(.+)$/);
  return match ? match[1] : null;
}

export function verifyAthenaWebhookSignature({ rawBody, signatureHeader, eventId, timestamp }) {
  const secret = String(env.athenaWebhookSecret || '').trim();
  if (!secret) return false;

  const signature = extractSignature(signatureHeader);
  if (!signature || !eventId || !timestamp) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > 300) return false;

  const bodyText = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {});
  const bodyHash = crypto.createHash('sha256').update(bodyText, 'utf8').digest('hex');
  const payload = `${timestamp}.${eventId}.${bodyHash}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  try {
    if (expectedSignature.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export { normalizeAthenaStatus };
