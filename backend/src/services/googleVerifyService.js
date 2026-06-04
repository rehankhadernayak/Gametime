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

  const tokenInfoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
  tokenInfoUrl.searchParams.set('access_token', accessToken);
  const tokenInfoRes = await fetch(tokenInfoUrl);
  if (!tokenInfoRes.ok) throw new ApiError(401, 'Invalid Google credential.');
  const tokenInfo = await tokenInfoRes.json();
  const tokenClientId = tokenInfo.azp || tokenInfo.aud;
  if (!tokenClientId || !audiences.includes(String(tokenClientId))) {
    throw new ApiError(401, 'Invalid Google credential.');
  }

  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new ApiError(401, 'Invalid Google credential.');
  const p = await res.json();
  if (!p?.sub || !p.email) throw new ApiError(401, 'Invalid Google credential.');
  const verified = p.email_verified === true || p.verified_email === true || p.email_verified === 'true';
  if (!verified) throw new ApiError(403, 'Verify your Google email before continuing.');
  const name = String(p.name || p.given_name || p.email.split('@')[0] || 'User').trim();
  return { sub: p.sub, email: p.email.toLowerCase(), name };
}
