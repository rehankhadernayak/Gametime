import { afterEach, describe, expect, test, vi } from 'vitest';
import { setupTestEnv } from './setupTestDb.js';

const ALLOWED_CLIENT = 'gametime-web-client-id.apps.googleusercontent.com';

describe('verifyGoogleIdentity accessToken audience', () => {
  afterEach(() => {
    setupTestEnv();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('rejects access tokens issued to a non-Gametime OAuth client', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_IDS = ALLOWED_CLIENT;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const href = String(url);
        if (href.includes('tokeninfo')) {
          return {
            ok: true,
            json: async () => ({ aud: 'evil-client-id.apps.googleusercontent.com', sub: 'google-sub' })
          };
        }
        throw new Error(`unexpected fetch: ${href}`);
      })
    );

    const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');
    await expect(
      verifyGoogleIdentity({ accessToken: 'stolen-access-token-abcdefghij' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('accepts access tokens when tokeninfo client matches GOOGLE_OAUTH_CLIENT_IDS', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_IDS = ALLOWED_CLIENT;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const href = String(url);
        if (href.includes('tokeninfo')) {
          return {
            ok: true,
            json: async () => ({ azp: ALLOWED_CLIENT, sub: 'google-sub-1' })
          };
        }
        if (href.includes('userinfo')) {
          return {
            ok: true,
            json: async () => ({
              sub: 'google-sub-1',
              email: 'parent@example.com',
              email_verified: true,
              name: 'Parent'
            })
          };
        }
        throw new Error(`unexpected fetch: ${href}`);
      })
    );

    const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');
    await expect(
      verifyGoogleIdentity({ accessToken: 'valid-access-token-abcdefghij' })
    ).resolves.toEqual({
      sub: 'google-sub-1',
      email: 'parent@example.com',
      name: 'Parent'
    });
  });
});
