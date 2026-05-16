import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

const oauth2Client = new OAuth2Client();

/**
 * @param {import('google-auth-library').TokenInfo} tokenInfo
 * @param {string[]} audiences
 */
function accessTokenAudienceAllowed(tokenInfo, audiences) {
  const audRaw = tokenInfo.aud ?? /** @type {{ audience?: string }} */ (tokenInfo).audience;
  const audStr = audRaw != null ? String(audRaw) : '';
  const azpStr = tokenInfo.azp != null ? String(tokenInfo.azp) : '';
  return (
    (audStr && audiences.includes(audStr)) ||
    (azpStr && audiences.includes(azpStr))
  );
}

function accessTokenHasEmailScope(tokenInfo) {
  const scopes = Array.isArray(tokenInfo.scopes) ? tokenInfo.scopes : [];
  return scopes.some((s) => String(s).includes('userinfo.email') || String(s) === 'email');
}

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

  let tokenInfo;
  try {
    tokenInfo = await oauth2Client.getTokenInfo(accessToken);
  } catch {
    throw new ApiError(401, 'Invalid Google credential.');
  }

  if (!accessTokenAudienceAllowed(tokenInfo, audiences)) {
    throw new ApiError(401, 'Invalid Google credential.');
  }

  if (!accessTokenHasEmailScope(tokenInfo)) {
    throw new ApiError(401, 'Invalid Google credential.');
  }

  const sub =
    tokenInfo.sub != null
      ? String(tokenInfo.sub)
      : tokenInfo.user_id != null
        ? String(tokenInfo.user_id)
        : '';
  const emailRaw = tokenInfo.email != null ? String(tokenInfo.email) : '';
  if (!sub || !emailRaw) {
    throw new ApiError(401, 'Invalid Google credential.');
  }

  const verified =
    tokenInfo.email_verified === true ||
    tokenInfo.email_verified === 'true' ||
    /** @type {{ verified_email?: boolean | string }} */ (tokenInfo).verified_email === true ||
    /** @type {{ verified_email?: boolean | string }} */ (tokenInfo).verified_email === 'true';
  if (!verified) {
    throw new ApiError(403, 'Verify your Google email before continuing.');
  }

  const email = emailRaw.toLowerCase();
  const ti = /** @type {{ name?: string; given_name?: string }} */ (tokenInfo);
  const name = String(ti.name || ti.given_name || email.split('@')[0] || 'User').trim();
  return { sub, email, name };
}
