import { describe, expect, test } from 'vitest';
import {
  createStrictCorsOriginValidator,
  isCodespacesLikeOrigin,
  normalizeOrigin
} from '../src/utils/productionCorsOrigin.js';

describe('production CORS origin policy', () => {
  test('normalizeOrigin trims and strips trailing slash', () => {
    expect(normalizeOrigin('  https://app.example.com/  ')).toBe('https://app.example.com');
  });

  test('production: arbitrary HTTPS origin is denied when not in allowlist', () => {
    const allows = createStrictCorsOriginValidator(
      ['https://trusted.example.com'],
      'production'
    );
    expect(allows('https://evil.example')).toBe(false);
    expect(allows('https://trusted.example.com')).toBe(true);
  });

  test('production: Codespaces-like origins stay allowed for preview frontends', () => {
    const allows = createStrictCorsOriginValidator(['https://app.example.com'], 'production');
    expect(allows('https://myrepo-abc123.github.dev')).toBe(true);
    expect(allows('https://myrepo-abc123.app.github.dev')).toBe(true);
  });

  test('production: Vercel wildcard entry allows https *.vercel.app only', () => {
    const allows = createStrictCorsOriginValidator(
      ['https://app.example.com', 'https://*.vercel.app'],
      'production'
    );
    expect(allows('https://gametime-git-main-foo.vercel.app')).toBe(true);
    expect(allows('https://evilvercel.app')).toBe(false);
  });

  test('production: dev tunnels are not allowed', () => {
    const allows = createStrictCorsOriginValidator(['https://app.example.com'], 'production');
    expect(allows('https://foo.trycloudflare.com')).toBe(false);
  });

  test('non-production: dev tunnel HTTPS origins are allowed', () => {
    const allows = createStrictCorsOriginValidator(['https://app.example.com'], 'test');
    expect(allows('https://foo.trycloudflare.com')).toBe(true);
  });

  test('isCodespacesLikeOrigin rejects non-codespaces hosts', () => {
    expect(isCodespacesLikeOrigin('https://evil.github.dev.evil.com')).toBe(false);
    expect(isCodespacesLikeOrigin('https://good.github.dev')).toBe(true);
  });
});
