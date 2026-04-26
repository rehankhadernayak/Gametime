import { useCallback, useEffect, useRef, useState } from 'react';

const HOLD_MS = 1500;
const R = 22;
const CIRC = 2 * Math.PI * R;

/**
 * Triggers onComplete after the button is held for holdMs (default 1.5s).
 * Shows a circular progress ring while pressed.
 */
export default function HoldToConfirmButton({
  label,
  onComplete,
  disabled = false,
  className = '',
  holdMs = HOLD_MS,
  'aria-label': ariaLabel
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const doneRef = useRef(false);

  const clearAnim = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    clearAnim();
    setProgress(0);
    onComplete();
    requestAnimationFrame(() => {
      doneRef.current = false;
    });
  }, [clearAnim, onComplete]);

  const tick = useCallback(
    (ts) => {
      if (startRef.current == null) return;
      const elapsed = ts - startRef.current;
      const p = Math.min(1, elapsed / holdMs);
      setProgress(p);
      if (p >= 1) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [finish, holdMs]
  );

  const onPointerDown = useCallback(
    (e) => {
      if (disabled || e.button !== 0) return;
      e.preventDefault();
      doneRef.current = false;
      startRef.current = performance.now();
      setProgress(0);
      rafRef.current = requestAnimationFrame(tick);
    },
    [disabled, tick]
  );

  const onPointerUp = useCallback(() => {
    clearAnim();
    setProgress(0);
  }, [clearAnim]);

  useEffect(() => () => clearAnim(), [clearAnim]);

  const dashOffset = CIRC * (1 - progress);
  const busy = progress > 0 && progress < 1;

  return (
    <button
      type="button"
      className={`hold-confirm-btn ${className}`.trim()}
      disabled={disabled}
      aria-label={ariaLabel || label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="hold-confirm-ring" viewBox="0 0 52 52" aria-hidden="true">
        <circle className="hold-confirm-track" cx="26" cy="26" r={R} />
        <circle
          className="hold-confirm-progress"
          cx="26"
          cy="26"
          r={R}
          strokeDasharray={CIRC}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="hold-confirm-label">{busy ? 'Keep holding…' : label}</span>
    </button>
  );
}
