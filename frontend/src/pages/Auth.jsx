import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { GametimeLink, useAppRouter } from '../shims/nav.vite.jsx';
import { apiRequest, isReviewerDemoParentEmail, setDemoMode } from '../api/client.js';
import BrutalistCard from '../components/BrutalistCard.jsx';
import BrutalistGoogleAuthBlock from '../components/BrutalistGoogleAuthBlock.jsx';
import './auth-brutal.css';

const GOOGLE_WEB_CLIENT_ID = String(import.meta.env?.VITE_GOOGLE_CLIENT_ID ?? '').trim();

/** ASCII-style mark (box-drawing); monospace rendering in .brutalist-logo-pre */
const ASCII_LOGO = `╔══════════════════╗
║   G A M E T I M E║
║  [ FAMILY v1 ]   ║
╚══════════════════╝`;

export default function Auth({ onAuth }) {
  const location = useLocation();
  const router = useAppRouter();
  const isRegister = location.pathname === '/signup';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [successLine, setSuccessLine] = useState('');

  useEffect(() => {
    setError('');
    setSuccessLine('');
    setPassword('');
    if (!isRegister) setName('');
  }, [isRegister]);

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSuccessLine('');
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: { name: trimmedName, email: trimmedEmail, password },
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'gametime_signup_context',
          JSON.stringify({
            numChildren: '',
            children: [],
            primaryConcern: '',
            referralSource: '',
          }),
        );
        localStorage.setItem('gametime_new_parent', '1');
      }
      setSuccessLine('Status: Account created');
      window.setTimeout(() => {
        onAuth({ token: data.token, role: 'parent', user: data.parent });
        router.push('/parent/onboarding');
      }, 420);
    } catch (err) {
      setError(err.message || 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSuccessLine('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email: trimmedEmail, password },
      });
      if (isReviewerDemoParentEmail(data.parent?.email)) {
        setDemoMode(true);
      }
      setSuccessLine('Status: Signed in');
      window.setTimeout(() => {
        onAuth({ token: data.token, role: 'parent', user: data.parent });
        router.push('/parent/ai');
      }, 420);
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-brutal-shell auth-brutal-ascii-bg">
      <header className="brutalist-top-nav">
        <pre className="brutalist-logo-pre" aria-label="Gametime logo">
          {ASCII_LOGO}
        </pre>
        <ul className="brutalist-nav-links">
          <li>
            <GametimeLink href="/" className="brutalist-nav-link">
              /HOME
            </GametimeLink>
          </li>
          <li>
            <GametimeLink href="/support" className="brutalist-nav-link">
              /SUPPORT
            </GametimeLink>
          </li>
        </ul>
      </header>

      <main className="auth-brutal-main">
        <div className="brutalist-mode-row" role="tablist" aria-label="Account mode">
          <button
            type="button"
            className="brutalist-mode-btn"
            aria-pressed={!isRegister}
            onClick={() => router.push('/login')}
          >
            Log in
          </button>
          <button
            type="button"
            className="brutalist-mode-btn"
            aria-pressed={isRegister}
            onClick={() => router.push('/signup')}
          >
            Register
          </button>
        </div>

        <BrutalistCard as="section" aria-labelledby="auth-form-title">
          <div className="brutalist-status-badge">Status: Available</div>
          <h1 className="brutalist-form-title" id="auth-form-title">
            {isRegister ? 'Parent registration' : 'Parent sign in'}
          </h1>

          {GOOGLE_WEB_CLIENT_ID ? (
            <BrutalistGoogleAuthBlock
              role="parent"
              parentIntent={isRegister ? 'signup' : 'signin'}
              disabled={busy || Boolean(successLine)}
              onError={setError}
              onAuthed={async (data) => {
                setError('');
                if (isReviewerDemoParentEmail(data.parent?.email)) {
                  setDemoMode(true);
                }
                if (isRegister && typeof window !== 'undefined') {
                  localStorage.setItem(
                    'gametime_signup_context',
                    JSON.stringify({
                      numChildren: '',
                      children: [],
                      primaryConcern: '',
                      referralSource: '',
                    }),
                  );
                  localStorage.setItem('gametime_new_parent', '1');
                }
                setSuccessLine(isRegister ? 'Status: Account created' : 'Status: Signed in with Google');
                window.setTimeout(() => {
                  onAuth({ token: data.token, role: 'parent', user: data.parent });
                  router.push(isRegister ? '/parent/onboarding' : '/parent/ai');
                }, 320);
              }}
            />
          ) : null}

          {isRegister ? (
            <form onSubmit={handleRegister} noValidate>
              <div className="brutalist-field">
                <label className="brutalist-label" htmlFor="auth-name">
                  Name
                </label>
                <input
                  id="auth-name"
                  className="brutalist-input"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="brutalist-field">
                <label className="brutalist-label" htmlFor="auth-email-reg">
                  Email
                </label>
                <input
                  id="auth-email-reg"
                  className="brutalist-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="parent@email.com"
                />
              </div>
              <div className="brutalist-field">
                <label className="brutalist-label" htmlFor="auth-password-reg">
                  Password
                </label>
                <input
                  id="auth-password-reg"
                  className="brutalist-input"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              {error ? (
                <p className="brutalist-error" role="alert">
                  {error}
                </p>
              ) : null}
              {successLine ? <p className="brutalist-success fade-in">{successLine}</p> : null}
              <button type="submit" className="brutalist-submit" disabled={busy || Boolean(successLine)}>
                {busy ? 'Submitting…' : 'Create account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} noValidate>
              <div className="brutalist-field">
                <label className="brutalist-label" htmlFor="auth-email-login">
                  Email
                </label>
                <input
                  id="auth-email-login"
                  className="brutalist-input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="parent@email.com"
                />
              </div>
              <div className="brutalist-field">
                <label className="brutalist-label" htmlFor="auth-password-login">
                  Password
                </label>
                <input
                  id="auth-password-login"
                  className="brutalist-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  placeholder="Password"
                />
              </div>
              <div className="brutalist-footer-links">
                <GametimeLink href="/forgot-password">Forgot password?</GametimeLink>
              </div>
              {error ? (
                <p className="brutalist-error" role="alert">
                  {error}
                </p>
              ) : null}
              {successLine ? <p className="brutalist-success fade-in">{successLine}</p> : null}
              <button type="submit" className="brutalist-submit" disabled={busy || Boolean(successLine)}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}

          <div className="brutalist-footer-links">
            {isRegister ? (
              <span>
                Already registered? <GametimeLink href="/login">Log in</GametimeLink>
              </span>
            ) : (
              <span>
                No account? <GametimeLink href="/signup">Create a parent account</GametimeLink>
              </span>
            )}
            <span>
              Child? <GametimeLink href="/child-login">Child login</GametimeLink>
            </span>
          </div>
        </BrutalistCard>
      </main>
    </div>
  );
}
