import { useState } from 'react';
import { GametimeLink, useAppRouter, useAppSearchParams } from 'gametime-web-nav';
import { apiRequest } from '../api/client.js';
import './auth.css';

/** Returns 0 (empty) | 1 (weak) | 2 (medium) | 3 (strong) */
function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || /\d/.test(pw)) score++;
  return score;
}

const STRENGTH_META = {
  0: { label: '', mod: '' },
  1: { label: 'Weak',   mod: 'weak' },
  2: { label: 'Medium', mod: 'medium' },
  3: { label: 'Strong', mod: 'strong' },
};

export default function ResetPassword() {
  const searchParams = useAppSearchParams();
  const router = useAppRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');

  const strength = getStrength(password);
  const { label: strengthLabel, mod: strengthMod } = STRENGTH_META[strength];

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }
    setStatus('loading');
    try {
      await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
      setStatus('done');
      setTimeout(() => router.push('/login'), 3000);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }

  return (
    <div className="al-centered-page">
      <div className="al-card">
        {/* Logo */}
        <div className="al-card-logo">
          <div className="al-card-logo-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z"
                fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <span className="al-card-logo-name">Gametime</span>
        </div>

        {status === 'done' ? (
          /* ── Success state ── */
          <div className="al-success-wrap">
            <div className="al-success-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M7 14.5l5 5 9-9" stroke="#16a34a" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="al-success-heading">Password updated!</h2>
            <p className="al-success-sub">
              Your password has been changed. Redirecting you to login in a moment…
            </p>
            <GametimeLink href="/login" className="al-back-link">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Go to login
            </GametimeLink>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="al-heading">Set new password</h1>
            <p className="al-subheading">Enter your new password below.</p>

            {/* Missing token warning */}
            {!token && (
              <p className="al-error" role="alert">
                Reset token is missing. Please use the link from your email.{' '}
                <GametimeLink href="/forgot-password" className="al-link">Request a new link</GametimeLink>
              </p>
            )}

            <form className="al-form al-form--stack" onSubmit={handleSubmit} noValidate>
              {/* New password */}
              <div className="al-field">
                <label className="al-label" htmlFor="rp-password">New password</label>
                <div className="al-input-wrap">
                  <input
                    id="rp-password"
                    className="al-input al-input--has-toggle"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

                {/* Strength meter */}
                {password.length > 0 && (
                  <div className="al-strength">
                    <div className="al-strength-bars" aria-hidden="true">
                      <div className={`al-strength-bar${strength >= 1 ? ` al-strength-bar--${strengthMod}` : ''}`} />
                      <div className={`al-strength-bar${strength >= 2 ? ` al-strength-bar--${strengthMod}` : ''}`} />
                      <div className={`al-strength-bar${strength >= 3 ? ` al-strength-bar--${strengthMod}` : ''}`} />
                    </div>
                    {strengthLabel && (
                      <span className={`al-strength-label al-strength-label--${strengthMod}`}>
                        {strengthLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="al-field">
                <label className="al-label" htmlFor="rp-confirm">Confirm new password</label>
                <div className="al-input-wrap">
                  <input
                    id="rp-confirm"
                    className="al-input al-input--has-toggle"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  <button
                    type="button"
                    className="al-toggle-btn"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
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

              {error && <p className="al-error" role="alert">{error}</p>}

              <button
                type="submit"
                className="al-btn"
                disabled={status === 'loading' || !token}
              >
                {status === 'loading' ? (
                  <>
                    <svg className="al-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                      <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>

            <div className="al-footer-links">
              <GametimeLink href="/login" className="al-back-link">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to login
              </GametimeLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
