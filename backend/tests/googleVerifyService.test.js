import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

const { verifyIdTokenMock, getTokenInfoMock, MockOAuth2Client } = vi.hoisted(() => {
  const verifyIdTokenMock = vi.fn();
  const getTokenInfoMock = vi.fn();
  function MockOAuth2Client() {
    this.verifyIdToken = verifyIdTokenMock;
    this.getTokenInfo = getTokenInfoMock;
  }
  return { verifyIdTokenMock, getTokenInfoMock, MockOAuth2Client };
});

vi.mock('google-auth-library', () => ({
  OAuth2Client: MockOAuth2Client
}));

describe('googleVerifyService', () => {
  let verifyGoogleIdentity;

  beforeAll(async () => {
    process.env.GOOGLE_OAUTH_CLIENT_IDS = 'gametime-web.apps.googleusercontent.com';
    vi.resetModules();
    ({ verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js'));
  });

  beforeEach(() => {
    verifyIdTokenMock.mockReset();
    getTokenInfoMock.mockReset();
  });

  test('id token path verifies JWT and ignores access token', async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-1',
        email: 'Parent@Example.com',
        email_verified: true,
        name: 'Pat'
      })
    });

    const out = await verifyGoogleIdentity({
      idToken: 'x'.repeat(21),
      accessToken: 'ya29.should-not-be-used'
    });

    expect(out).toEqual({ sub: 'google-sub-1', email: 'parent@example.com', name: 'Pat' });
    expect(verifyIdTokenMock).toHaveBeenCalledTimes(1);
    expect(getTokenInfoMock).not.toHaveBeenCalled();
  });

  test('access token path accepts allowlisted aud', async () => {
    getTokenInfoMock.mockResolvedValue({
      aud: 'gametime-web.apps.googleusercontent.com',
      sub: 's1',
      email: 'kid@example.com',
      email_verified: true,
      scopes: ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'profile'],
      expiry_date: Date.now() + 3600_000
    });

    const out = await verifyGoogleIdentity({ accessToken: 'ya29.dummy-access' });

    expect(out).toEqual({ sub: 's1', email: 'kid@example.com', name: 'kid' });
    expect(getTokenInfoMock).toHaveBeenCalledTimes(1);
  });

  test('access token path accepts audience field and azp fallback', async () => {
    getTokenInfoMock.mockResolvedValue({
      audience: 'gametime-web.apps.googleusercontent.com',
      sub: 's-azp',
      email: 'a@b.com',
      email_verified: 'true',
      scopes: ['https://www.googleapis.com/auth/userinfo.email'],
      expiry_date: Date.now() + 3600_000
    });

    const out = await verifyGoogleIdentity({ accessToken: 'ya29.azp-case' });
    expect(out.email).toBe('a@b.com');
  });

  test('access token path accepts allowlisted azp when aud is not listed', async () => {
    getTokenInfoMock.mockResolvedValue({
      aud: 'other.apps.googleusercontent.com',
      azp: 'gametime-web.apps.googleusercontent.com',
      sub: 's2',
      email: 'a@b.com',
      email_verified: true,
      scopes: ['email'],
      expiry_date: Date.now() + 3600_000
    });

    const out = await verifyGoogleIdentity({ accessToken: 'ya29.second' });
    expect(out.sub).toBe('s2');
  });

  test('access token path rejects tokens minted for another OAuth client', async () => {
    getTokenInfoMock.mockResolvedValue({
      aud: 'malicious.apps.googleusercontent.com',
      azp: 'malicious.apps.googleusercontent.com',
      sub: 'victim-sub',
      email: 'victim@gmail.com',
      email_verified: true,
      scopes: ['https://www.googleapis.com/auth/userinfo.email'],
      expiry_date: Date.now() + 3600_000
    });

    await expect(verifyGoogleIdentity({ accessToken: 'stolen-token' })).rejects.toMatchObject({
      statusCode: 401
    });
  });

  test('access token path rejects missing email scope', async () => {
    getTokenInfoMock.mockResolvedValue({
      aud: 'gametime-web.apps.googleusercontent.com',
      sub: 's3',
      email: 'a@b.com',
      email_verified: true,
      scopes: ['openid', 'profile'],
      expiry_date: Date.now() + 3600_000
    });

    await expect(verifyGoogleIdentity({ accessToken: 'ya29.no-email-scope' })).rejects.toMatchObject({
      statusCode: 401
    });
  });

  test('access token path rejects unverified email', async () => {
    getTokenInfoMock.mockResolvedValue({
      aud: 'gametime-web.apps.googleusercontent.com',
      sub: 's4',
      email: 'a@b.com',
      email_verified: false,
      scopes: ['https://www.googleapis.com/auth/userinfo.email'],
      expiry_date: Date.now() + 3600_000
    });

    await expect(verifyGoogleIdentity({ accessToken: 'ya29.unverified' })).rejects.toMatchObject({
      statusCode: 403
    });
  });

  test('access token path rejects invalid token from Google', async () => {
    getTokenInfoMock.mockRejectedValue(new Error('invalid_token'));

    await expect(verifyGoogleIdentity({ accessToken: 'ya29.invalid-token-value' })).rejects.toMatchObject({
      statusCode: 401
    });
  });
});
