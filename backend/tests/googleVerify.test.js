import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const ALLOWED_CLIENT = 'allowed-client.apps.googleusercontent.com';

vi.mock('../src/config/env.js', () => ({
  env: {
    googleOAuthClientIds: [ALLOWED_CLIENT]
  }
}));

const mockVerifyIdToken = vi.fn();

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken
  }))
}));

describe('verifyGoogleIdentity access-token client binding', () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerifyIdToken.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('rejects access tokens issued to an unknown OAuth client', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-123',
        email: 'victim@gmail.com',
        email_verified: 'true',
        azp: 'attacker-client.apps.googleusercontent.com'
      })
    });

    const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');

    await expect(
      verifyGoogleIdentity({ accessToken: 'ya29.attacker-token' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('accepts access tokens issued to a configured OAuth client', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-456',
        email: 'user@gmail.com',
        email_verified: 'true',
        azp: ALLOWED_CLIENT
      })
    });

    const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');

    const profile = await verifyGoogleIdentity({ accessToken: 'ya29.valid-token' });
    expect(profile).toEqual({
      sub: 'google-sub-456',
      email: 'user@gmail.com',
      name: 'user'
    });
  });
});
