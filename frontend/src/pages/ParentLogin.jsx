import { useState } from 'react';
import { GametimeLink, useAppRouter } from '../shims/nav.vite.jsx';
import { apiRequest } from '../api/client.js';
import './auth.css';

export default function ParentLogin({ onAuth }) {
  const router = useAppRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const normalized = {
      email: form.email.trim(),
      password: form.password,
    };
    if (!normalized.email || !normalized.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', { method: 'POST', body: normalized });
      onAuth({ token: data.token, role: 'parent', user: data.parent });
      router.push('/parent/ai');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="al-root">
      {/* ── Left brand panel ── */}
      <div className="al-panel">
        <div className="al-panel-blob" aria-hidden="true" />

        {/* Logo */}
        <div className="al-logo">
          <div className="al-logo-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
                fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="al-logo-name">Gametime</span>
        </div>

        {/* Feature bullets */}
        <div className="al-features-wrap">
          <h2 className="al-tagline">Family gaming,<br />earned and managed.</h2>
          <p className="al-tagline-sub">
            Set tasks, review evidence, and keep gaming time fair - all in one place.
          </p>

          <ul className="al-features" aria-label="Key features">
            <li className="al-feature-item">
              <span className="al-feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5A1.5 1.5 0 0 1 9.5 3v.5H13A1.5 1.5 0 0 1 14.5 5v8A1.5 1.5 0 0 1 13 14.5H3A1.5 1.5 0 0 1 1.5 13V5A1.5 1.5 0 0 1 3 3.5h3.5V3A1.5 1.5 0 0 1 8 1.5Z"
                    stroke="white" strokeWidth="1.25" strokeLinejoin="round" />
                  <path d="M5.5 9l1.75 1.75L10.5 7" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="al-feature-text">
                <strong>AI Reviews Evidence</strong>
                <span>Photos and videos reviewed instantly</span>
              </span>
            </li>
            <li className="al-feature-item">
              <span className="al-feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="4" width="13" height="9" rx="1.5" stroke="white" strokeWidth="1.25" />
                  <path d="M5 4V3a3 3 0 0 1 6 0v1" stroke="white" strokeWidth="1.25" strokeLinecap="round" />
                  <circle cx="8" cy="8.5" r="1.5" fill="white" fillOpacity="0.85" />
                </svg>
              </span>
              <span className="al-feature-text">
                <strong>Real Gift Cards</strong>
                <span>Roblox, Steam, Razer Gold &amp; more</span>
              </span>
            </li>
            <li className="al-feature-item">
              <span className="al-feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.25" />
                  <path d="M8 5v3.5l2 1.5" stroke="white" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="al-feature-text">
                <strong>Gaming Time Control</strong>
                <span>Daily caps and session rules</span>
              </span>
            </li>
          </ul>
        </div>

        <p className="al-trust">
          <span className="al-trust-dot" aria-hidden="true" />
          Trusted by Singapore families
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="al-form-panel">
        <div className="al-form-inner">
          <h1 className="al-heading">Welcome back</h1>
          <p className="al-subheading">Sign in to manage your family</p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="al-field">
              <label className="al-label" htmlFor="pl-email">Email</label>
              <div className="al-input-wrap">
                <input
                  id="pl-email"
                  className="al-input"
                  type="email"
                  placeholder="parent@email.com"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password */}
            <div className="al-field">
              <label className="al-label" htmlFor="pl-password">Password</label>
              <div className="al-input-wrap">
                <input
                  id="pl-password"
                  className="al-input al-input--has-toggle"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="al-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.8 5.2 1.8 6.5 1.5 8c.8 3 3.9 5 6.5 5 1.3 0 2.5-.4 3.5-1.1M6.5 3.1C7 3 7.5 3 8 3c2.6 0 5.7 2 6.5 5-.3 1-.8 1.9-1.5 2.6"
                        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <ellipse cx="8" cy="8" rx="6.5" ry="4" stroke="currentColor" strokeWidth="1.3" />
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot link */}
            <div className="al-field-footer">
              <GametimeLink href="/forgot-password" className="al-link">Forgot password?</GametimeLink>
            </div>

            {/* Error */}
            {error && <p className="al-error" role="alert">{error}</p>}

            {/* Submit */}
            <button type="submit" className="al-btn" disabled={loading}>
              {loading ? (
                <>
                  <svg className="al-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="al-footer-links">
            <span className="al-footer-text">
              No account?{' '}
              <GametimeLink href="/signup" className="al-link">Create a parent account</GametimeLink>
            </span>
            <span className="al-footer-text">
              Child?{' '}
              <GametimeLink href="/child-login" className="al-link">Child login</GametimeLink>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
