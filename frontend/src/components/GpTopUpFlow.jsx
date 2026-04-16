import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import './GpTopUpFlow.css';

/* ── Quick-amount presets in cents ──────────────────────────────────── */
const QUICK_AMOUNTS = [500, 1000, 2000, 5000]; // $5, $10, $20, $50

function fmtDollars(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDollarsShort(cents) {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d}` : `$${d.toFixed(2)}`;
}

/* ── Step indicator ─────────────────────────────────────────────────── */
function StepIndicator({ current, steps }) {
  return (
    <ol className="topup-steps" aria-label="Progress">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <li
            key={label}
            className={`topup-step ${active ? 'topup-step-active' : ''} ${done ? 'topup-step-done' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="topup-step-num" aria-hidden="true">{done ? '✓' : idx}</span>
            <span className="topup-step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Step 1: Amount selection ───────────────────────────────────────── */
function AmountStep({ amountCents, customInput, onQuickSelect, onCustomChange }) {
  return (
    <div className="topup-step-body">
      <p className="topup-step-hint">Choose an amount to add to your children's gaming wallet.</p>

      <div className="topup-quick-amounts" role="group" aria-label="Quick amount selection">
        {QUICK_AMOUNTS.map((cents) => (
          <button
            key={cents}
            type="button"
            className={`topup-quick-btn ${amountCents === cents ? 'topup-quick-btn-selected' : ''}`}
            aria-pressed={amountCents === cents}
            onClick={() => onQuickSelect(cents)}
          >
            <span aria-label={`${cents / 100} Singapore dollars`}>{fmtDollarsShort(cents)}</span>
          </button>
        ))}
      </div>

      <div className="topup-custom-wrap">
        <label htmlFor="topup-custom-input" className="topup-custom-label">
          Custom amount (SGD)
        </label>
        <div className="topup-custom-input-wrap">
          <span className="topup-currency-prefix" aria-hidden="true">$</span>
          <input
            id="topup-custom-input"
            type="number"
            min="1"
            max="200"
            step="0.01"
            inputMode="decimal"
            placeholder="e.g. 15.00"
            value={customInput}
            onChange={(e) => onCustomChange(e.target.value)}
            className="topup-custom-input"
          />
        </div>
        <span className="topup-custom-hint">Min $1 · Max $200 SGD</span>
      </div>
    </div>
  );
}

/* ── Step 2: Child allocation ───────────────────────────────────────── */
function AllocateStep({ children, allocations, totalCents, onUpdate }) {
  function handleSlider(childId, rawPct) {
    const pct = Math.max(0, Math.min(100, Number(rawPct)));
    const others = allocations.filter((a) => a.childId !== childId);
    const remaining = 100 - pct;

    let updated;
    if (others.length === 0) {
      updated = [{ childId, percent: 100, amountCents: totalCents }];
    } else {
      // Distribute remainder evenly among others
      const perOther = remaining / others.length;
      updated = allocations.map((a) => {
        if (a.childId === childId) {
          return { ...a, percent: pct, amountCents: Math.floor(totalCents * pct / 100) };
        }
        return { ...a, percent: perOther, amountCents: Math.floor(totalCents * perOther / 100) };
      });
    }
    onUpdate(updated);
  }

  function equalSplit() {
    const pct = 100 / children.length;
    onUpdate(
      children.map((c) => ({
        childId: c.id,
        percent: pct,
        amountCents: Math.floor(totalCents * pct / 100),
      }))
    );
  }

  const total = allocations.reduce((s, a) => s + a.percent, 0);
  const valid = Math.abs(total - 100) < 0.5;

  return (
    <div className="topup-step-body">
      <div className="topup-allocate-header">
        <p className="topup-step-hint">How should {fmtDollars(totalCents)} be split across your children?</p>
        {children.length > 1 && (
          <button type="button" className="topup-equal-split-btn" onClick={equalSplit}>
            Split equally
          </button>
        )}
      </div>

      <div className="topup-allocations">
        {allocations.map((alloc) => {
          const child = children.find((c) => c.id === alloc.childId);
          if (!child) return null;
          const pct = Math.round(alloc.percent);
          return (
            <div key={alloc.childId} className="topup-alloc-row">
              <div className="topup-alloc-info">
                <div className="topup-alloc-avatar" aria-hidden="true">
                  {child.avatarUrl
                    ? <img src={child.avatarUrl} alt="" className="topup-alloc-avatar-img" />
                    : <span>{child.name[0]}</span>}
                </div>
                <span className="topup-alloc-name">{child.name}</span>
                <span className="topup-alloc-amount">{fmtDollars(alloc.amountCents)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={pct}
                aria-label={`${child.name} allocation`}
                aria-valuenow={pct}
                onChange={(e) => handleSlider(alloc.childId, e.target.value)}
                className="topup-alloc-slider"
              />
              <span className="topup-alloc-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      {!valid && (
        <p className="topup-alloc-warning" role="alert">
          Allocations must add up to 100% (currently {Math.round(total)}%)
        </p>
      )}
    </div>
  );
}

/* ── Step 3: Order summary ──────────────────────────────────────────── */
function ConfirmStep({ amountCents, allocations, children }) {
  return (
    <div className="topup-step-body">
      <p className="topup-step-hint">Review your order before paying.</p>

      <div className="topup-summary-table">
        <div className="topup-summary-row topup-summary-total">
          <span>Total</span>
          <strong>
            <span aria-label={`${amountCents / 100} Singapore dollars`}>
              {fmtDollars(amountCents)} SGD
            </span>
          </strong>
        </div>
        {allocations.map((alloc) => {
          const child = children.find((c) => c.id === alloc.childId);
          if (!child) return null;
          return (
            <div key={alloc.childId} className="topup-summary-row">
              <span>{child.name}</span>
              <span>
                <span aria-label={`${alloc.amountCents / 100} Singapore dollars`}>
                  {fmtDollars(alloc.amountCents)}
                </span>
                {' '}
                <span className="topup-summary-pct">({Math.round(alloc.percent)}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="topup-payment-note">
        Powered by Stripe · Secured by Gametime
      </p>
    </div>
  );
}

/* ── Main GpTopUpFlow component ─────────────────────────────────────── */
export default function GpTopUpFlow({ children, onClose, onSuccess, token }) {
  const STEPS = ['Amount', 'Allocate', 'Confirm'];
  const [step, setStep] = useState(1);
  const [amountCents, setAmountCents] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const closeRef = useRef(null);
  const liveRef = useRef(null);

  // Initialise allocations when children are known
  useEffect(() => {
    if (!children?.length) return;
    const pct = 100 / children.length;
    setAllocations(
      children.map((c) => ({
        childId: c.id,
        percent: pct,
        amountCents: 0,
      }))
    );
  }, [children]);

  // Update allocation amounts when total changes
  useEffect(() => {
    setAllocations((prev) =>
      prev.map((a) => ({
        ...a,
        amountCents: Math.floor(amountCents * a.percent / 100),
      }))
    );
  }, [amountCents]);

  // Announce step changes
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = `Step ${step} of ${STEPS.length}: ${STEPS[step - 1]}`;
    }
  }, [step]);

  // Focus trap + escape
  useEffect(() => {
    const prev = document.activeElement;
    setTimeout(() => closeRef.current?.focus(), 50);

    function handleKey(e) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [onClose, submitting]);

  /* ── Derived validity ─────────────────────────────────────────────── */
  const resolvedAmount = (() => {
    if (amountCents > 0) return amountCents;
    const parsed = parseFloat(customInput);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 200) return Math.round(parsed * 100);
    return 0;
  })();

  const allocTotal = allocations.reduce((s, a) => s + a.percent, 0);
  const allocValid = Math.abs(allocTotal - 100) < 0.5;

  const stepValid = step === 1
    ? resolvedAmount > 0
    : step === 2
    ? allocValid
    : true;

  function handleQuickSelect(cents) {
    setAmountCents(cents);
    setCustomInput('');
  }

  function handleCustomChange(val) {
    setCustomInput(val);
    setAmountCents(0);
  }

  function prevStep() {
    setStep((s) => Math.max(1, s - 1));
    setError(null);
  }

  function nextStep() {
    if (step === 1) {
      setAllocations((prev) =>
        prev.map((a) => ({
          ...a,
          amountCents: Math.floor(resolvedAmount * a.percent / 100),
        }))
      );
      // Auto-skip allocate step if only 1 child
      if (children.length === 1) {
        setAllocations([{ childId: children[0].id, percent: 100, amountCents: resolvedAmount }]);
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    } else {
      handleConfirm();
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      // Backend accepts amountSgd (integer SGD cents converted to dollars)
      const amountSgd = Math.round(resolvedAmount / 100);
      const res = await apiRequest('/stripe/checkout', {
        method: 'POST',
        token,
        body: { amountSgd },
      });

      onSuccess(resolvedAmount);
      window.location.href = res.url;
    } catch (e) {
      setError(e.message || 'Payment session failed. Please try again.');
      setSubmitting(false);
    }
  }

  if (!children?.length) {
    return (
      <div className="topup-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="topup-modal" role="dialog" aria-modal="true" aria-labelledby="topup-title">
          <div className="topup-header">
            <h2 id="topup-title" className="topup-title">Add Gaming Funds</h2>
            <button ref={closeRef} type="button" className="topup-close-btn" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="topup-no-children">
            <p>Add a child profile before topping up.</p>
            <button type="button" className="topup-btn topup-btn-primary" onClick={onClose}>
              Go to Manage Children
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="topup-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="topup-modal" role="dialog" aria-modal="true" aria-labelledby="topup-title">
        {/* Live region for step announcements */}
        <div ref={liveRef} aria-live="polite" className="topup-sr-only" />

        {/* Header */}
        <div className="topup-header">
          <div className="topup-header-left">
            <h2 id="topup-title" className="topup-title">Add Gaming Funds</h2>
            <StepIndicator current={step} steps={STEPS} />
          </div>
          <button
            ref={closeRef}
            type="button"
            className="topup-close-btn"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="topup-body">
          {step === 1 && (
            <AmountStep
              amountCents={amountCents}
              customInput={customInput}
              onQuickSelect={handleQuickSelect}
              onCustomChange={handleCustomChange}
            />
          )}
          {step === 2 && (
            <AllocateStep
              children={children}
              allocations={allocations}
              totalCents={resolvedAmount}
              onUpdate={setAllocations}
            />
          )}
          {step === 3 && (
            <ConfirmStep
              amountCents={resolvedAmount}
              allocations={allocations}
              children={children}
            />
          )}

          {error && (
            <div className="topup-error-banner" role="alert">
              {error}
              <button
                type="button"
                className="topup-btn topup-btn-ghost"
                onClick={() => { setError(null); setSubmitting(false); }}
              >
                Try again
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="topup-footer">
          {step > 1 && (
            <button
              type="button"
              className="topup-btn topup-btn-secondary"
              onClick={prevStep}
              disabled={submitting}
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            className="topup-btn topup-btn-primary"
            onClick={nextStep}
            disabled={!stepValid || submitting}
            aria-busy={submitting}
          >
            {submitting
              ? 'Connecting to payment…'
              : step === STEPS.length
              ? 'Confirm & Pay'
              : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
