import { useState } from 'react';
import { GametimeLink, useAppRouter } from 'gametime-web-nav';
import { apiRequest } from '../api/client.js';
import ChildPinLogin from '../components/ChildPinLogin.jsx';
import './auth.css';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export default function ChildLogin({ onAuth }) {
  const router = useAppRouter();
  const [mode, setMode] = useState('email'); // 'email' | 'pin'
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [pinForm, setPinForm] = useState({ parentEmail: '', childName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // PIN sub-step: 'form' → look up child, then 'numpad'
  const [pinStep, setPinStep] = useState('form'); // 'form' | 'numpad'
  const [pinChildProfile, setPinChildProfile] = useState(null); // { id, name, avatarUrl, avatarColor }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'email') {
        const email = emailForm.email.trim();
        const password = emailForm.password.trim();
        if (!email || !password) throw new Error('Email and password are required.');
        if (!isValidEmail(email)) throw new Error('Enter a valid child email address.');

        const data = await apiRequest('/auth/child-login-direct', {
          method: 'POST',
          body: { email, password: emailForm.password },
        });
        await onAuth({ token: data.token, role: 'child', user: data.child });
        router.push('/child/dashboard');
      } else {
        // PIN mode - step 1: validate inputs, then show numpad for PIN entry
        const parentEmail = pinForm.parentEmail.trim();
        const childName = pinForm.childName.trim();
        if (!parentEmail || !childName)
          throw new Error('Parent email and child name are required.');
        if (!isValidEmail(parentEmail))
          throw new Error('Enter a valid parent email address.');

        // No lookup endpoint - show numpad directly with the info entered
        setPinChildProfile({
          id: null,
          name: childName,
          parentEmail,
          avatarUrl: null,
          avatarColor: 'var(--bg-muted-action)',
        });
        setPinStep('numpad');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSuccess(token) {
    await onAuth({ token, role: 'child', user: pinChildProfile });
    router.push('/child/dashboard');
  }

  // Full-screen numpad once child is looked up
  if (mode === 'pin' && pinStep === 'numpad' && pinChildProfile) {
    return (
      <ChildPinLogin
        child={pinChildProfile}
        onSuccess={handlePinSuccess}
        onSwitchUser={() => {
          setPinStep('form');
          setPinChildProfile(null);
          setError('');
        }}
      />
    );
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
                fill="currentColor" />
            </svg>
          </div>
          <span className="al-logo-name">Gametime</span>
        </div>

        {/* Feature bullets */}
        <div className="al-features-wrap">
          <h2 className="al-tagline">Complete quests.<br />Earn your play time.</h2>
          <p className="al-tagline-sub">
            Finish tasks, collect RP, and unlock the gaming time you've worked for.
          </p>

          <ul className="al-features" aria-label="Child features">
            <li className="al-feature-item">
              <span className="al-feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1.5L9.8 6H14.5L10.5 8.8L12 13.5L8 10.8L4 13.5L5.5 8.8L1.5 6H6.2L8 1.5Z"
                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
                </svg>
              </span>
              <span className="al-feature-text">
                <strong>Earn RP for every quest</strong>
                <span>Photos prove you finished the job</span>
              </span>
            </li>
            <li className="al-feature-item">
              <span className="al-feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1.5" y="4" width="13" height="9" rx="0" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M5 4V3a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  <circle cx="8" cy="8.5" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <span className="al-feature-text">
                <strong>Unlock real gift cards</strong>
                <span>Roblox, Steam, Razer Gold &amp; more</span>
              </span>
            </li>
            <li className="al-feature-item">
              <span className="al-feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="al-feature-text">
                <strong>Track your gaming time</strong>
                <span>See sessions and daily caps clearly</span>
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
          <h1 className="al-heading">Child sign in</h1>
          <p className="al-subheading">Choose how you want to sign in</p>

          {/* Tab switcher */}
          <div className="al-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={`al-tab${mode === 'email' ? ' al-tab--active' : ''}`}
              onClick={() => { setMode('email'); setError(''); }}
            >
              Sign in with password
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'pin'}
              className={`al-tab${mode === 'pin' ? ' al-tab--active' : ''}`}
              onClick={() => { setMode('pin'); setError(''); setPinStep('form'); }}
            >
              Sign in with PIN
            </button>
          </div>

          <form className="al-form al-form--stack" onSubmit={handleSubmit} noValidate>
            {mode === 'email' ? (
              <>
                {/* Email */}
                <div className="al-field">
                  <label className="al-label" htmlFor="cl-email">Child Email</label>
                  <div className="al-input-wrap">
                    <input
                      id="cl-email"
                      className="al-input"
                      type="email"
                      placeholder="child@email.com"
                      autoComplete="email"
                      required
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="al-field">
                  <label className="al-label" htmlFor="cl-password">Password</label>
                  <div className="al-input-wrap">
                    <input
                      id="cl-password"
                      className="al-input al-input--has-toggle"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
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

                {error && <p className="al-error" role="alert">{error}</p>}

                <button type="submit" className="al-btn al-btn--child" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="al-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </>
            ) : (
              <>
                {/* PIN lookup step */}
                <div className="al-field">
                  <label className="al-label" htmlFor="cl-parent-email">Parent Email</label>
                  <div className="al-input-wrap">
                    <input
                      id="cl-parent-email"
                      className="al-input"
                      type="email"
                      placeholder="parent@email.com"
                      autoComplete="off"
                      required
                      value={pinForm.parentEmail}
                      onChange={(e) => setPinForm({ ...pinForm, parentEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="al-field">
                  <label className="al-label" htmlFor="cl-child-name">Your Name</label>
                  <div className="al-input-wrap">
                    <input
                      id="cl-child-name"
                      className="al-input"
                      type="text"
                      placeholder="What your parents call you"
                      autoComplete="off"
                      required
                      value={pinForm.childName}
                      onChange={(e) => setPinForm({ ...pinForm, childName: e.target.value })}
                    />
                  </div>
                </div>

                <p className="al-pin-hint">You'll enter your 4-digit PIN on the next screen.</p>

                {error && <p className="al-error" role="alert">{error}</p>}

                <button type="submit" className="al-btn al-btn--child" disabled={loading}>
                  {loading ? (
                    <>
                      <svg className="al-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Looking up…
                    </>
                  ) : (
                    <>Continue →</>
                  )}
                </button>
              </>
            )}
          </form>

          {/* Footer */}
          <div className="al-footer-links">
            <span className="al-footer-text">
              Parent?{' '}
              <GametimeLink href="/login" className="al-link">Use parent login</GametimeLink>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
