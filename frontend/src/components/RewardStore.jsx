import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';
import './RewardStore.css';

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtCost(cost, currency) {
  if (currency === 'GP') return `$${(cost / 100).toFixed(2)} GP`;
  return `${cost} RP`;
}

function categoryLabel(cat) {
  const map = { gaming_time: 'Gaming Time', giftcard: 'Gift Cards', custom: 'Custom' };
  return map[cat] || cat;
}

/* ── Confetti ─────────────────────────────────────────────────────── */
function ConfettiLayer() {
  const canvasRef = useRef(null);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ['var(--color-success)', 'var(--color-warning)', 'var(--bg-action)', 'var(--color-energy)', '#FF3D5A'];
    const RESOLVED = ['#06D3A8', '#FFA500', '#7C5BFF', '#22D8E7', '#FF3D5A'];

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: 4 + Math.random() * 6,
      color: RESOLVED[Math.floor(Math.random() * RESOLVED.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 3 + Math.random() * 5,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 8,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let done = true;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < canvas.height) done = false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r);
        ctx.restore();
      }
      if (!done) raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  if (reduceMotion) return null;
  return <canvas ref={canvasRef} className="rs-confetti-canvas" aria-hidden="true" />;
}

/* ── Reward card ──────────────────────────────────────────────────── */
function RewardCard({ reward, canAfford, onClick }) {
  const locked = !canAfford;
  return (
    <button
      type="button"
      className={`rs-card ${locked ? 'rs-card-locked' : ''}`}
      onClick={() => onClick(reward)}
      aria-label={`${reward.title}, ${fmtCost(reward.pointsCost, reward.pointsType)}${locked ? ', locked' : ''}`}
      aria-disabled={locked}
    >
      <div className="rs-card-image-wrap">
        {reward.imageUrl
          ? <img src={reward.imageUrl} alt={reward.platform ? `${reward.platform} reward` : ''} className="rs-card-img" />
          : <div className="rs-card-img-placeholder" aria-hidden="true">{categoryLabel(reward.category)[0]}</div>}
        {reward.pointsType === 'GP' && (
          <span className="rs-gp-badge" aria-label="GP reward">GP</span>
        )}
        {locked && (
          <div className="rs-locked-overlay" aria-hidden="true">
            <span className="rs-lock-icon">LOCK</span>
          </div>
        )}
      </div>
      <div className="rs-card-body">
        <span className="rs-card-name">{reward.title}</span>
        {reward.platform && <span className="rs-card-platform">{reward.platform}</span>}
        <span className={`rs-card-cost ${locked ? 'rs-card-cost-locked' : ''}`}>
          {fmtCost(reward.pointsCost, reward.pointsType)}
        </span>
      </div>
    </button>
  );
}

/* ── Reward grid skeleton ─────────────────────────────────────────── */
function RewardGridSkeleton() {
  return (
    <div className="rs-grid" aria-busy="true" aria-label="Loading rewards">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rs-card-skeleton">
          <div className="skeleton-line rs-skel-img" />
          <div className="rs-card-body">
            <div className="skeleton-line medium" />
            <div className="skeleton-line short" style={{ marginTop: '0.3rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Detail sheet ─────────────────────────────────────────────────── */
function RewardDetailSheet({ reward, canAfford, onRedeem, onClose, redeeming }) {
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="rs-sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rs-sheet" role="dialog" aria-modal="true" aria-label={`Reward: ${reward.title}`}>
        <button ref={closeRef} type="button" className="rs-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        {reward.imageUrl && (
          <img src={reward.imageUrl} alt={reward.platform ? `${reward.platform} reward` : reward.title} className="rs-sheet-img" />
        )}
        <div className="rs-sheet-body">
          <h2 className="rs-sheet-title">{reward.title}</h2>
          {reward.platform && <span className="rs-sheet-platform">{reward.platform}</span>}
          {reward.description && <p className="rs-sheet-desc">{reward.description}</p>}
          <div className={`rs-cost-pill rs-cost-pill-${reward.pointsType.toLowerCase()}`}>
            {fmtCost(reward.pointsCost, reward.pointsType)}
          </div>
          <button
            type="button"
            className="rs-redeem-btn"
            onClick={onRedeem}
            disabled={!canAfford || redeeming}
            aria-busy={redeeming}
          >
            {redeeming ? 'Redeeming…' : canAfford ? `Redeem for ${fmtCost(reward.pointsCost, reward.pointsType)}` : 'Not enough balance'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Locked sheet ─────────────────────────────────────────────────── */
function LockedSheet({ reward, balance, onClose }) {
  const needed = reward.pointsType === 'RP'
    ? reward.pointsCost - balance.rpBalance
    : Math.max(0, reward.pointsCost - balance.gpBalance);

  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="rs-sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rs-sheet rs-sheet-locked" role="dialog" aria-modal="true" aria-label="Locked reward">
        <button type="button" className="rs-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="rs-locked-icon" aria-hidden="true">LOCK</div>
        <h2 className="rs-sheet-title">Keep earning!</h2>
        <p className="rs-locked-msg">
          You need <strong>{needed} {reward.pointsType}</strong> more to unlock <strong>{reward.title}</strong>.
        </p>
        <p className="rs-locked-hint">Ask a parent to set more tasks so you can earn more {reward.pointsType}.</p>
        <button type="button" className="rs-sheet-close-btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

/* ── Confirm redeem dialog ────────────────────────────────────────── */
function ConfirmRedeemDialog({ reward, onConfirm, onCancel }) {
  const confirmRef = useRef(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);
  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  return (
    <div className="rs-sheet-backdrop">
      <div
        className="rs-confirm-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rs-confirm-title"
        aria-describedby="rs-confirm-desc"
      >
        <h3 id="rs-confirm-title">Confirm redemption</h3>
        <p id="rs-confirm-desc" className="rs-confirm-desc">
          Spend <strong>{fmtCost(reward.pointsCost, reward.pointsType)}</strong> for <strong>{reward.title}</strong>?
        </p>
        <div className="rs-confirm-actions">
          <button ref={confirmRef} type="button" className="rs-redeem-btn" onClick={onConfirm}>
            Yes, redeem!
          </button>
          <button type="button" className="rs-btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Redemption success screen ────────────────────────────────────── */
function RedemptionSuccess({ redemption, onBack }) {
  return (
    <div className="rs-redeemed">
      <ConfettiLayer />
      <div className="rs-redeemed-content">
        <h2>Reward sent!</h2>
        <p className="rs-redeemed-msg">{redemption?.message || 'Your parent will fulfill this reward soon.'}</p>
        <button type="button" className="rs-btn-secondary" onClick={onBack}>Back to Store</button>
      </div>
    </div>
  );
}

/* ── Main RewardStore ─────────────────────────────────────────────── */
export default function RewardStore({ childId, token, onBalanceChange }) {
  const [phase, setPhase] = useState('loading');
  const [rewards, setRewards] = useState([]);
  const [balance, setBalance] = useState({ rpBalance: 0, gpBalance: 0 });
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('popular');
  const [selected, setSelected] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastRedemption, setLastRedemption] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const [rRes, meRes] = await Promise.all([
        apiRequest('/rewards/list', { token }),
        apiRequest('/auth/me', { token }),
      ]);
      setRewards(Array.isArray(rRes) ? rRes : []);
      const user = meRes?.user ?? {};
      setBalance({
        rpBalance: user.pointsBalance ?? 0,
        gpBalance: user.giftcardPointsBalance ?? 0,
      });
      setPhase('browsing');
    } catch (e) {
      setErrorMessage(e.message || 'Failed to load store.');
      setPhase('error');
    }
  }, [childId, token]);

  useEffect(() => { load(); }, [load]);

  function canAfford(reward) {
    if (reward.pointsType === 'GP') return balance.gpBalance >= reward.pointsCost;
    return balance.rpBalance >= reward.pointsCost;
  }

  function select(reward) {
    setSelected(reward);
    setPhase(canAfford(reward) ? 'detail' : 'locked');
  }

  function deselect() {
    setSelected(null);
    setPhase('browsing');
  }

  function startRedeem() {
    setPhase('confirming');
  }

  async function doRedeem() {
    if (!selected) return;
    setRedeeming(true);
    setPhase('redeeming');
    try {
      const res = await apiRequest('/rewards/redeem', {
        method: 'POST',
        token,
        body: { rewardId: selected.id },
      });
      setLastRedemption(res);
      // Refresh balance from /auth/me
      const meRes = await apiRequest('/auth/me', { token });
      const user = meRes?.user ?? {};
      const newBalance = {
        rpBalance: user.pointsBalance ?? 0,
        gpBalance: user.giftcardPointsBalance ?? 0,
      };
      setBalance(newBalance);
      if (onBalanceChange) onBalanceChange(newBalance.rpBalance, newBalance.gpBalance);
      setPhase('redeemed');
    } catch {
      setPhase('detail');
    } finally {
      setRedeeming(false);
    }
  }

  function resetStore() {
    setSelected(null);
    setLastRedemption(null);
    setPhase('browsing');
  }

  /* ── Filtered & sorted rewards ──────────────────────────────────── */
  const filtered = rewards.filter((r) => {
    if (!r.active) return false;
    if (filter === 'all') return true;
    return r.category === filter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'cost_asc') return a.pointsCost - b.pointsCost;
    if (sort === 'newest') return 0; // server order
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); // popular = featured first
  });

  /* ── Render ─────────────────────────────────────────────────────── */
  if (phase === 'redeemed') {
    return (
      <div className="rs-wrap">
        <RedemptionSuccess redemption={lastRedemption} onBack={resetStore} />
      </div>
    );
  }

  return (
    <div className="rs-wrap">
      {/* Balance display */}
      <div className="rs-header">
        <div className="rs-balances">
          <output className="rs-balance rs-balance-rp" aria-live="polite" aria-label={`${balance.rpBalance} Reward Points`}>
            <span className="rs-bal-val">{balance.rpBalance}</span>
            <span className="rs-bal-label">RP</span>
          </output>
          <output className="rs-balance rs-balance-gp" aria-live="polite" aria-label={`${(balance.gpBalance / 100).toFixed(2)} Gift Card Points`}>
            <span className="rs-bal-val">${(balance.gpBalance / 100).toFixed(2)}</span>
            <span className="rs-bal-label">GP</span>
          </output>
        </div>
        <label className="rs-sort-label">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rs-sort-select">
            <option value="popular">Popular</option>
            <option value="newest">Newest</option>
            <option value="cost_asc">Cost: low → high</option>
          </select>
        </label>
      </div>

      {/* Filter tabs */}
      <div className="rs-filter-tabs" role="tablist" aria-label="Filter rewards by category">
        {[
          { value: 'all', label: 'All' },
          { value: 'gaming_time', label: 'Gaming Time' },
          { value: 'giftcard', label: 'Gift Cards' },
          { value: 'custom', label: 'Custom' },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            className={`rs-tab ${filter === tab.value ? 'rs-tab-active' : ''}`}
            aria-selected={filter === tab.value}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {phase === 'loading' && <RewardGridSkeleton />}

      {phase === 'error' && (
        <div className="rs-error-state">
          <p>{errorMessage}</p>
          <button type="button" className="rs-btn-secondary" onClick={load}>Try Again</button>
        </div>
      )}

      {['browsing', 'detail', 'locked', 'confirming', 'redeeming'].includes(phase) && (
        sorted.length === 0
          ? (
            <div className="rs-empty-state">
              <p>
                {filter === 'all'
                  ? 'No rewards set up yet. Ask a parent!'
                  : `No ${categoryLabel(filter)} rewards yet. Ask a parent to add some!`}
              </p>
            </div>
          )
          : (
            <div className="rs-grid">
              {sorted.map((r) => (
                <RewardCard
                  key={r.id}
                  reward={r}
                  canAfford={canAfford(r)}
                  onClick={select}
                />
              ))}
            </div>
          )
      )}

      {/* Sheets / dialogs */}
      {phase === 'detail' && selected && (
        <RewardDetailSheet
          reward={selected}
          canAfford={canAfford(selected)}
          onRedeem={startRedeem}
          onClose={deselect}
          redeeming={redeeming}
        />
      )}
      {phase === 'locked' && selected && (
        <LockedSheet reward={selected} balance={balance} onClose={deselect} />
      )}
      {phase === 'confirming' && selected && (
        <ConfirmRedeemDialog reward={selected} onConfirm={doRedeem} onCancel={() => setPhase('detail')} />
      )}
      {phase === 'redeeming' && selected && (
        <RewardDetailSheet
          reward={selected}
          canAfford={canAfford(selected)}
          onRedeem={doRedeem}
          onClose={deselect}
          redeeming={true}
        />
      )}
    </div>
  );
}
