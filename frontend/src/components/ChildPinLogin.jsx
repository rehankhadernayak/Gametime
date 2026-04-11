import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import './ChildPinLogin.css';

/* ── Numpad layout ─────────────────────────────────────────────────── */
const NUMPAD = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [null, 0, 'del'],
];

/* ── BackspaceIcon ─────────────────────────────────────────────────── */
function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d="M21 4H7l-6 8 6 8h14V4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 9l-4 6m0-6l4 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Main ChildPinLogin component ──────────────────────────────────── */
export default function ChildPinLogin({ child, onSuccess, onSwitchUser, token }) {
  const [digits, setDigits] = useState([]);
  const [phase, setPhase] = useState('idle'); // idle | entering | verifying | shaking | locked | success
  const [errorMessage, setErrorMessage] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);
  const lockoutRef = useRef(null);
  const dotRowRef = useRef(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lockout countdown
  useEffect(() => {
    if (phase !== 'locked') {
      clearInterval(lockoutRef.current);
      return;
    }
    if (lockoutSecondsLeft <= 0) {
      setPhase('idle');
      setDigits([]);
      setAttemptsRemaining(3);
      setErrorMessage(null);
      return;
    }
    lockoutRef.current = setInterval(() => {
      setLockoutSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(lockoutRef.current);
          setPhase('idle');
          setDigits([]);
          setAttemptsRemaining(3);
          setErrorMessage(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(lockoutRef.current);
  }, [phase, lockoutSecondsLeft]);

  const appendDigit = useCallback((digit) => {
    if (['verifying', 'locked', 'shaking', 'success'].includes(phase)) return;
    setDigits((prev) => {
      if (prev.length >= 4) return prev;
      return [...prev, String(digit)];
    });
    setPhase('entering');
  }, [phase]);

  const deleteDigit = useCallback(() => {
    if (['verifying', 'locked', 'shaking', 'success'].includes(phase)) return;
    setDigits((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setPhase('idle');
      return next;
    });
  }, [phase]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (digits.length === 4 && phase === 'entering') {
      verify(digits.join(''));
    }
  }, [digits, phase]);

  // Keyboard support
  useEffect(() => {
    function handleKey(e) {
      if (e.key >= '0' && e.key <= '9') appendDigit(e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete') deleteDigit();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [appendDigit, deleteDigit]);

  async function verify(pin) {
    setPhase('verifying');
    try {
      const res = await apiRequest('/auth/child-login-pin', {
        method: 'POST',
        body: { parentEmail: child.parentEmail, childName: child.name, pin },
        token,
      });
      setPhase('success');
      setTimeout(() => onSuccess(res.token), 300);
    } catch (e) {
      const remaining = e.details?.attemptsRemaining ?? attemptsRemaining - 1;
      setAttemptsRemaining(remaining);

      if (remaining <= 0) {
        setPhase('locked');
        setLockoutSecondsLeft(30);
        setErrorMessage('Too many tries. Wait 30s and try again.');
        setDigits([]);
      } else {
        setErrorMessage(`Wrong PIN – ${remaining} tr${remaining === 1 ? 'y' : 'ies'} left`);
        setPhase('shaking');
        setTimeout(() => {
          setPhase('idle');
          setDigits([]);
          setErrorMessage(null);
        }, 600);
      }
    }
  }

  const disabled = phase === 'verifying' || phase === 'locked' || phase === 'success';

  return (
    <div className="cpl-wrap">
      {/* Back button */}
      <button
        type="button"
        className="cpl-back-btn"
        onClick={onSwitchUser}
        aria-label="Switch to a different user"
      >
        ← Switch user
      </button>

      {/* Avatar */}
      <div className="cpl-avatar-wrap">
        {child.avatarUrl
          ? (
            <img
              src={child.avatarUrl}
              alt={`${child.name}'s avatar`}
              className="cpl-avatar-img"
            />
          )
          : (
            <div
              className="cpl-avatar-fallback"
              style={{ background: child.avatarColor || 'var(--bg-muted-action)' }}
              aria-hidden="true"
            >
              {child.name[0]}
            </div>
          )}
      </div>

      {/* Child name */}
      <h1 className="cpl-name">{child.name}</h1>

      {/* PIN dots */}
      <div
        ref={dotRowRef}
        className={`cpl-dots ${phase === 'shaking' ? (reduceMotion ? 'cpl-dots-error' : 'cpl-dots-shake') : ''} ${phase === 'verifying' ? 'cpl-dots-verifying' : ''} ${phase === 'success' ? 'cpl-dots-success' : ''}`}
        aria-label={`PIN entry: ${digits.length} of 4 digits entered`}
        aria-live="polite"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`cpl-dot ${i < digits.length ? 'cpl-dot-filled' : ''} ${(phase === 'shaking' || (phase === 'idle' && errorMessage)) ? 'cpl-dot-error' : ''} ${phase === 'success' ? 'cpl-dot-success' : ''} ${phase === 'verifying' ? 'cpl-dot-pulse' : ''}`}
          />
        ))}
      </div>

      {/* Error message */}
      {(phase === 'shaking' || errorMessage) && phase !== 'locked' && errorMessage && (
        <p className="cpl-error" role="alert">{errorMessage}</p>
      )}

      {/* Lockout message */}
      {phase === 'locked' && (
        <p className="cpl-lockout" role="alert">
          Too many tries. Wait{' '}
          <span aria-live={lockoutSecondsLeft % 5 === 0 ? 'polite' : 'off'}>
            {lockoutSecondsLeft}s
          </span>{' '}
          and try again.
        </p>
      )}

      {/* Numpad */}
      <div
        className="cpl-numpad"
        role="group"
        aria-label="PIN keypad"
      >
        {NUMPAD.map((row, ri) => (
          <div key={ri} className="cpl-numpad-row">
            {row.map((key, ci) => {
              if (key === null) {
                return <div key={ci} className="cpl-numpad-spacer" />;
              }
              if (key === 'del') {
                return (
                  <button
                    key="del"
                    type="button"
                    className="cpl-key cpl-key-del"
                    onClick={deleteDigit}
                    disabled={disabled || digits.length === 0}
                    aria-label="Delete last digit"
                  >
                    <BackspaceIcon />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  className="cpl-key cpl-key-digit"
                  onClick={() => appendDigit(key)}
                  disabled={disabled}
                  aria-label={String(key)}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
