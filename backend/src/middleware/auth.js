import jwt from 'jsonwebtoken';
import { getDb } from '../db/connection.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

function getToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.gametime_token;
}

async function decodeAndValidate(req) {
  const token = getToken(req);
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired session');
  }

  const db = await getDb();
  const session = await db.get('SELECT * FROM sessions WHERE id = ? AND revoked = 0', payload.sessionId);
  if (!session) throw new ApiError(401, 'Session has been revoked');

  return payload;
}

export async function requireParentAuth(req, _res, next) {
  try {
    const payload = await decodeAndValidate(req);
    if (payload.role !== 'parent') throw new ApiError(403, 'Parent access required');
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireChildAuth(req, _res, next) {
  try {
    const payload = await decodeAndValidate(req);
    if (payload.role !== 'child') throw new ApiError(403, 'Child access required');
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAnyAuth(req, _res, next) {
  try {
    req.auth = await decodeAndValidate(req);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdminAuth(req, _res, next) {
  try {
    const payload = await decodeAndValidate(req);
    if (!payload.isAdmin) throw new ApiError(403, 'Admin access required');
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
}
