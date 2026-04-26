import { describe, expect, test } from 'vitest';
import { httpsVercelAppWildcardConfigured, isHttpsVercelAppOrigin } from '../src/utils/corsOrigins.js';

describe('corsOrigins', () => {
  test('wildcard entry enables any https *.vercel.app origin', () => {
    expect(httpsVercelAppWildcardConfigured(['https://app.example.com', 'https://*.vercel.app'])).toBe(true);
    expect(httpsVercelAppWildcardConfigured(['https://*.vercel.app/'])).toBe(true);
    expect(httpsVercelAppWildcardConfigured(['https://gametime.vercel.app'])).toBe(false);
  });

  test('isHttpsVercelAppOrigin', () => {
    expect(isHttpsVercelAppOrigin('https://gametime-git-main-foo.vercel.app')).toBe(true);
    expect(isHttpsVercelAppOrigin('https://gametime.vercel.app')).toBe(true);
    expect(isHttpsVercelAppOrigin('http://gametime.vercel.app')).toBe(false);
    expect(isHttpsVercelAppOrigin('https://evilvercel.app')).toBe(false);
    expect(isHttpsVercelAppOrigin('https://vercel.app')).toBe(false);
    expect(isHttpsVercelAppOrigin('not a url')).toBe(false);
  });
});
