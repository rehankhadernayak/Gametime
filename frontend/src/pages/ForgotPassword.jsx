import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import './auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setStatus('loading');
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setStatus('sent');
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

        {status === 'sent' ? (
          /* ── Success state ── */
          <div className="al-success-wrap">
            <div className="al-success-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M7 14.5l5 5 9-9" stroke="#16a34a" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="al-success-heading">Check your inbox</h2>
            <p className="al-success-sub">
              If that email is registered, a reset link is on its way. Check your inbox — and your spam folder.
            </p>
            <Link to="/login" className="al-back-link">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to login
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 className="al-heading">Forgot password?</h1>
            <p className="al-subheading">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="al-field">
                <label className="al-label" htmlFor="fp-email">Email address</label>
                <div className="al-input-wrap">
                  <input
                    id="fp-email"
                    className="al-input"
                    type="email"
                    placeholder="parent@email.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {error && <p className="al-error" role="alert">{error}</p>}

              <button type="submit" className="al-btn" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <svg className="al-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                      <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="al-footer-links">
              <Link to="/login" className="al-back-link">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
