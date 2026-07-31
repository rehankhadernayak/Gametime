import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => {
  process.env.GOOGLE_OAUTH_CLIENT_IDS = 'allowed-web-client,ios-client';
});

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  getTokenInfo: vi.fn()
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    constructor() {
      this.verifyIdToken = mocks.verifyIdToken;
      this.getTokenInfo = mocks.getTokenInfo;
    }
  }
}));

let verifyGoogleIdentity;

beforeAll(async () => {
  ({ verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js'));
});

beforeEach(() => {
  mocks.verifyIdToken.mockReset();
  mocks.getTokenInfo.mockReset();
});

function baseTokenInfo(overrides = {}) {
  return {
    aud: 'allowed-web-client',
    sub: 'google-sub-1',
    user_id: 'google-sub-1',
    email: 'user@example.com',
    email_verified: true,
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/userinfo.profile'],
    expiry_date: Date.now() + 3600_000,
    ...overrides
  };
}

describe('verifyGoogleIdentity', () => {
  test('rejects access token when audience and azp are not allowed clients', async () => {
    mocks.getTokenInfo.mockResolvedValue(
      baseTokenInfo({
        aud: 'some-other-oauth-client',
        azp: 'another-untrusted-client',
        email_verified: 'true'
      })
    );
    await expect(verifyGoogleIdentity({ accessToken: 'valid-length-token' })).rejects.toMatchObject({
      statusCode: 401
    });
  });

  test('accepts access token when aud matches configured client', async () => {
    mocks.getTokenInfo.mockResolvedValue(
      baseTokenInfo({
        email_verified: 'true',
        name: 'Test User'
      })
    );
    const out = await verifyGoogleIdentity({ accessToken: 'valid-length-token' });
    expect(out).toEqual({
      sub: 'google-sub-1',
      email: 'user@example.com',
      name: 'Test User'
    });
  });

  test('accepts access token when only azp matches (hybrid client)', async () => {
    mocks.getTokenInfo.mockResolvedValue(
      baseTokenInfo({
        aud: 'unlisted-aud',
        azp: 'ios-client',
        email_verified: true
      })
    );
    const out = await verifyGoogleIdentity({ accessToken: 'valid-length-token' });
    expect(out.sub).toBe('google-sub-1');
    expect(out.email).toBe('user@example.com');
  });

  test('rejects access token without email scope', async () => {
    mocks.getTokenInfo.mockResolvedValue(
      baseTokenInfo({
        scopes: ['openid', 'https://www.googleapis.com/auth/userinfo.profile']
      })
    );
    await expect(verifyGoogleIdentity({ accessToken: 'valid-length-token' })).rejects.toMatchObject({
      statusCode: 401
    });
  });

  test('prefers id token path when both tokens are present', async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'from-id-token',
        email: 'Id@Example.com',
        email_verified: true,
        name: 'Id User',
        given_name: 'Id'
      })
    });
    mocks.getTokenInfo.mockResolvedValue(baseTokenInfo({ sub: 'from-access' }));

    const out = await verifyGoogleIdentity({
      idToken: 'x'.repeat(21),
      accessToken: 'access-token-here'
    });
    expect(out.sub).toBe('from-id-token');
    expect(out.email).toBe('id@example.com');
    expect(mocks.verifyIdToken).toHaveBeenCalledTimes(1);
    expect(mocks.getTokenInfo).not.toHaveBeenCalled();
  });
});
