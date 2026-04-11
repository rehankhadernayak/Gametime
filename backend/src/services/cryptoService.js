import crypto from 'crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const ENCRYPTION_ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret || '')).digest();
}

function normalizeSecret(secret, fieldName = 'secret') {
  const value = String(secret || '').trim();
  if (!value) {
    throw new ApiError(500, `Missing ${fieldName} for cryptographic operation`);
  }
  return value;
}

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

export function encryptString(plaintext, secret = env.dataEncryptionKey) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const normalized = normalizeSecret(secret, 'DATA_ENCRYPTION_KEY');
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, deriveKey(normalized), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptString(cipherPayload, secret = env.dataEncryptionKey) {
  if (!cipherPayload) return null;
  const normalized = normalizeSecret(secret, 'DATA_ENCRYPTION_KEY');
  const parts = String(cipherPayload).split(':');
  if (parts.length !== 3) {
    throw new ApiError(500, 'Encrypted payload is malformed');
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  try {
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, deriveKey(normalized), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new ApiError(500, 'Encrypted payload could not be decrypted');
  }
}

export function safeDecryptString(cipherPayload, secret = env.dataEncryptionKey) {
  try {
    return decryptString(cipherPayload, secret);
  } catch {
    return null;
  }
}

export function encryptHexCiphertext(plaintext, secret) {
  const normalized = normalizeSecret(secret, 'ATHENA_GIFTCODE_SECRET');
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, deriveKey(normalized), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertextHex: encrypted.toString('hex'),
    ivHex: iv.toString('hex'),
    tagHex: tag.toString('hex')
  };
}

export function decryptHexCiphertext({ ciphertextHex, ivHex, tagHex }, secret) {
  const normalized = normalizeSecret(secret, 'ATHENA_GIFTCODE_SECRET');
  try {
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, deriveKey(normalized), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new ApiError(502, 'Failed to decrypt giftcodes from provider');
  }
}
