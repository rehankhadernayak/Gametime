import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import './ParentPinGate.css';

/**
 * Lets a signed-in child prove parent identity (account password) to receive
 * a parent session. Updates auth + cookies immediately on success.
 */
export default function ParentPinGate({ onElevated }) {
  const navigate = useNavigate();
  const { token, setAuth, refreshCookieRole, unlockParentNav } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await apiRequest('/auth/elevate-to-parent', {
        method: 'POST',
        token: token || undefined,
        body: { password }
      });
      const nextAuth = {
        token: data.token,
        role: 'parent',
        user: data.parent
      };
      setAuth(nextAuth);
      unlockParentNav();
      refreshCookieRole();
      window.dispatchEvent(new CustomEvent('gametime:cookie-role-refresh'));
      window.dispatchEvent(new CustomEvent('gametime:auth-updated', { detail: nextAuth }));
      setPassword('');
      onElevated?.();
      navigate('/parent/ai', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not verify parent password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="parent-pin-gate panel" aria-labelledby="parent-pin-gate-title">
      <h2 id="parent-pin-gate-title">Parent access</h2>
      <p className="section-subtitle">
        Enter your parent account password to open the parent dashboard on this device.
      </p>
      <form className="parent-pin-gate-form" onSubmit={handleSubmit}>
        <label className="parent-pin-gate-label">
          Parent password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            disabled={busy}
          />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <button type="submit" className="primary-button" disabled={busy || !password}>
          {busy ? 'Verifying…' : 'Switch to parent'}
        </button>
      </form>
    </section>
  );
}
