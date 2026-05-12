import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const oauth2Client = new OAuth2Client();

/**
 * @param {{ idToken?: string, accessToken?: string }} input
 * @returns {Promise<{ sub: string, email: string, name: string }>}
 */
export async function verifyGoogleIdentity(input) {
  const audiences = env.googleOAuthClientIds;
  if (!audiences.length) {
    throw new ApiError(503, 'Google sign-in is not configured on this server.');
  }

  const idToken = typeof input.idToken === 'string' && input.idToken.length > 20 ? input.idToken : undefined;
  const accessToken =
    typeof input.accessToken === 'string' && input.accessToken.length > 10 ? input.accessToken : undefined;

  if (!idToken && !accessToken) {
    throw new ApiError(400, 'Google idToken or accessToken is required.');
  }

  if (idToken) {
    let ticket;
    try {
      ticket = await oauth2Client.verifyIdToken({
        idToken,
        audience: audiences.length === 1 ? audiences[0] : audiences
      });
    } catch {
      throw new ApiError(401, 'Invalid Google credential.');
    }
    const p = ticket.getPayload();
    if (!p?.sub || !p.email) throw new ApiError(401, 'Invalid Google credential.');
    if (!p.email_verified) throw new ApiError(403, 'Verify your Google email before continuing.');
    const name = String(p.name || p.given_name || p.email.split('@')[0] || 'User').trim();
    return { sub: p.sub, email: p.email.toLowerCase(), name };
  }

  /** Access tokens must be issued to one of our OAuth clients — userinfo alone does not prove that. */
  let tokenInfo;
  try {
    tokenInfo = await oauth2Client.getTokenInfo(accessToken);
  } catch {
    throw new ApiError(401, 'Invalid Google credential.');
  }
  const aud = tokenInfo.aud;
  const azp = tokenInfo.azp;
  const audOk = Boolean(aud && audiences.includes(aud));
  const azpOk = Boolean(azp && audiences.includes(azp));
  if (!audOk && !azpOk) {
    throw new ApiError(401, 'Invalid Google credential.');
  }
  const scopes = Array.isArray(tokenInfo.scopes) ? tokenInfo.scopes : [];
  const hasEmailScope = scopes.some(
    (s) => s === 'email' || s === 'https://www.googleapis.com/auth/userinfo.email' || s.endsWith('/auth/userinfo.email')
  );
  if (!hasEmailScope) {
    throw new ApiError(401, 'Invalid Google credential.');
  }
  const sub = tokenInfo.sub || tokenInfo.user_id;
  const email = typeof tokenInfo.email === 'string' ? tokenInfo.email.toLowerCase() : '';
  if (!sub || !email) throw new ApiError(401, 'Invalid Google credential.');
  const ev = tokenInfo.email_verified;
  const emailVerified = ev === true || ev === 'true' || ev === '1';
  if (!emailVerified) {
    throw new ApiError(403, 'Verify your Google email before continuing.');
  }
  const rawName =
    typeof tokenInfo.name === 'string' && tokenInfo.name.trim()
      ? tokenInfo.name.trim()
      : typeof tokenInfo.given_name === 'string' && tokenInfo.given_name.trim()
        ? tokenInfo.given_name.trim()
        : email.split('@')[0] || 'User';
  const name = String(rawName).trim();
  return { sub, email, name };
}
