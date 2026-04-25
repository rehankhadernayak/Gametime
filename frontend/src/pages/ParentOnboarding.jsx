import { useState } from 'react';
import { useAppRouter } from 'gametime-web-nav';
import { apiRequest } from '../api/client.js';
import './ParentOnboarding.css';

/* ── Constants ────────────────────────────────────────────────────────────── */

const AGES = Array.from({ length: 8 }, (_, i) => i + 6); // 6-13

const TASK_TILES = [
  { icon: '', title: 'Clean your bedroom',    description: 'Tidy up and make the bed.',           points: 20, category: 'chores'     },
  { icon: '', title: 'Finish homework',         description: 'Complete all school assignments.',     points: 15, category: 'school'     },
  { icon: '', title: 'Clear the table',        description: 'Clear and wipe the dining table.',     points: 10, category: 'chores'     },
  { icon: '', title: 'Water the plants',        description: 'Water all plants in the house.',       points: 10, category: 'chores'     },
  { icon: '', title: 'Make the bed',           description: 'Make your bed neatly every morning.',  points: 5,  category: 'chores'     },
  { icon: '', title: 'Read for 20 minutes',    description: 'Read any book for at least 20 min.',   points: 15, category: 'school'     },
];

const POINTS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Convert a whole-number age to an approximate ISO date (mid-year). */
function ageToDob(age) {
  return `${new Date().getFullYear() - age}-06-15`;
}

/** Tomorrow at noon as an ISO datetime string. */
function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/* ── Step progress bar ────────────────────────────────────────────────────── */

function ProgressBar({ step, total }) {
  return (
    <div className="ob-progress" aria-label={`Step ${step} of ${total}`}>
      <div className="ob-progress-label">Step {step} of {total}</div>
      <div className="ob-progress-track">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`ob-progress-seg${i < step ? ' ob-progress-seg--done' : ''}`} />
        ))}
      </div>
    </div>
  );
}

/* ── PIN input ────────────────────────────────────────────────────────────── */

function PinInput({ value, onChange }) {
  const digits = value.split('').concat(Array(4).fill('')).slice(0, 4);

  function handleKey(index, e) {
    const ch = e.target.value.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, i) => (i === index ? ch : d)).join('');
    onChange(next);
    // Auto-advance
    if (ch && index < 3) {
      const sibling = e.target.closest('.ob-pin-row')?.children[index + 1];
      if (sibling) sibling.focus();
    }
  }

  function handleBackspace(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const sibling = e.target.closest('.ob-pin-row')?.children[index - 1];
      if (sibling) sibling.focus();
    }
  }

  return (
    <div className="ob-pin-row" role="group" aria-label="4-digit PIN">
      {digits.map((d, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="ob-pin-box"
          value={d}
          onChange={(e) => handleKey(i, e)}
          onKeyDown={(e) => handleBackspace(i, e)}
          aria-label={`PIN digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ── Confetti ─────────────────────────────────────────────────────────────── */

const CONFETTI_COLOURS = ['#7C5BFF', '#22D8E7', '#06D3A8', '#FFA500', '#FF3D5A'];
const CONFETTI_COUNT = 48;

function Confetti() {
  const pieces = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    id: i,
    colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 1.2}s`,
    size: `${6 + Math.random() * 8}px`,
    duration: `${1.4 + Math.random() * 1}s`,
  }));

  return (
    <div className="ob-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="ob-confetti-piece"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.colour,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function ParentOnboarding({ token, onComplete = () => {} }) {
  const router = useAppRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Step 2 - child
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(9);
  const [childPin, setChildPin] = useState('');
  const [createdChild, setCreatedChild] = useState(null); // { id, name }

  // Step 3 - task
  const [selectedTile, setSelectedTile] = useState(null); // index
  const [customTask, setCustomTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPoints, setTaskPoints] = useState(15);
  const [createdTask, setCreatedTask] = useState(null);

  // Step 4 - reward
  const [rewardType, setRewardType] = useState(''); // 'gaming' | 'giftcard' | ''
  const [gamingMinutes, setGamingMinutes] = useState(30);
  const [gamingCost, setGamingCost] = useState(50);
  const [createdReward, setCreatedReward] = useState(null);

  function skip() {
    router.push('/parent/ai');
  }

  function back() {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  }

  /* ── Step 1 → 2 ──────────────────────────────────────────────────────── */
  function handleStep1() {
    setStep(2);
  }

  /* ── Step 2: create child ─────────────────────────────────────────────── */
  async function handleStep2() {
    if (!childName.trim()) { setError('Please enter your child\'s name.'); return; }
    if (childPin && childPin.length !== 4) { setError('PIN must be exactly 4 digits, or leave it blank.'); return; }
    setError('');
    setBusy(true);
    try {
      const body = {
        name: childName.trim(),
        dateOfBirth: ageToDob(childAge),
        ...(childPin ? { pin: childPin } : {}),
      };
      const child = await apiRequest('/children/create', { method: 'POST', token, body });
      setCreatedChild({ id: child.id, name: child.name });
      setStep(3);
    } catch (e) {
      setError(e.message || 'Could not create child profile. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  /* ── Step 3: create task ──────────────────────────────────────────────── */
  async function handleStep3() {
    const tile = selectedTile !== null ? TASK_TILES[selectedTile] : null;
    const title = customTask ? taskTitle.trim() : tile?.title;
    const description = customTask ? taskDesc.trim() : tile?.description;
    const points = customTask ? taskPoints : tile?.points ?? 15;
    const category = customTask ? 'other' : tile?.category ?? 'other';

    if (!title) { setError('Please select or name a task.'); return; }
    if (!description) { setError('Please add a short task description.'); return; }

    setError('');
    setBusy(true);
    try {
      const task = await apiRequest('/tasks/create', {
        method: 'POST',
        token,
        body: { childId: createdChild.id, title, description, points, dueDate: tomorrowIso(), category },
      });
      setCreatedTask(task);
      setStep(4);
    } catch (e) {
      setError(e.message || 'Could not create task. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  /* ── Step 4: create reward (optional) ────────────────────────────────── */
  async function handleStep4(skip4 = false) {
    if (skip4) { setDone(true); return; }
    if (!rewardType) { setError('Please choose a reward type, or skip.'); return; }

    const title = rewardType === 'gaming'
      ? `${gamingMinutes} min Gaming Session`
      : 'Gift Card Reward';
    const pointsCost = rewardType === 'gaming' ? gamingCost : 100;
    const pointsType = rewardType === 'gaming' ? 'RP' : 'GP';

    setError('');
    setBusy(true);
    try {
      const reward = await apiRequest('/rewards/create', {
        method: 'POST',
        token,
        body: { title, pointsCost, pointsType, active: true },
      });
      setCreatedReward(reward);
      setDone(true);
    } catch (e) {
      setError(e.message || 'Could not create reward. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  if (done) {
    return (
      <div className="ob-backdrop">
        <Confetti />
        <div className="ob-card ob-card--success">
          <h1 className="ob-success-title">You're all set!</h1>
          <p className="ob-success-sub">
            {createdChild?.name}'s first task is live. Share the app with them to get started.
          </p>
          <div className="ob-success-recap">
            {createdChild && <span className="ob-recap-pill">{createdChild.name}</span>}
            {createdTask && <span className="ob-recap-pill">{createdTask.title}</span>}
            {createdReward && <span className="ob-recap-pill">{createdReward.title}</span>}
          </div>
          {childPin && (
            <p className="ob-success-pin">
              Child PIN: <strong>{childPin}</strong> - share this with {createdChild?.name}
            </p>
          )}
          <button className="ob-btn ob-btn--primary" onClick={() => router.push('/parent/ai')}>
            Open Family Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ob-backdrop">
      <div className="ob-card">
        {/* ── Step 1: Welcome ──────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <ProgressBar step={1} total={4} />
            <h1 className="ob-heading">Welcome to Gametime!</h1>
            <p className="ob-sub">Let's set up your family in under 5 minutes so your child can start earning rewards today.</p>
            <div className="ob-callout">
              <strong>How it works:</strong> You create tasks → your child submits photo proof → AI reviews it → you approve → they earn points → they redeem for gaming time or gift cards.
            </div>
            <button className="ob-btn ob-btn--primary" onClick={handleStep1}>
              Let's Go →
            </button>
            <button className="ob-btn ob-btn--ghost" onClick={skip}>
              Already set up? Skip tour →
            </button>
          </>
        )}

        {/* ── Step 2: Add child ─────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <ProgressBar step={2} total={4} />
            <h1 className="ob-heading">Add your first child</h1>
            <p className="ob-sub">You can add more children later from the Family tab.</p>

            {error && <p className="ob-error" role="alert">{error}</p>}

            <div className="ob-field">
              <label className="ob-label" htmlFor="ob-child-name">Child's name</label>
              <input
                id="ob-child-name"
                className="ob-input"
                type="text"
                placeholder="e.g. Aiden"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="ob-field">
              <label className="ob-label">Age</label>
              <div className="ob-age-grid">
                {AGES.map((age) => (
                  <button
                    key={age}
                    type="button"
                    className={`ob-age-btn${childAge === age ? ' ob-age-btn--selected' : ''}`}
                    onClick={() => setChildAge(age)}
                  >
                    {age}
                  </button>
                ))}
              </div>
              <p className="ob-helper">
                Ages 6-9 use a PIN. Ages 10-13 can use email + password.
              </p>
            </div>

            <div className="ob-field">
              <label className="ob-label">PIN <span className="ob-optional">(optional)</span></label>
              <PinInput value={childPin} onChange={setChildPin} />
              <p className="ob-helper">Your child will use this to log in on their device.</p>
            </div>

            <div className="ob-actions">
              <button className="ob-btn ob-btn--ghost ob-btn--back" onClick={back}>← Back</button>
              <button className="ob-btn ob-btn--primary" onClick={handleStep2} disabled={busy}>
                {busy ? 'Adding…' : 'Add Child →'}
              </button>
            </div>
            <button className="ob-btn ob-btn--ghost" onClick={skip}>Skip setup for now</button>
          </>
        )}

        {/* ── Step 3: First task ────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <ProgressBar step={3} total={4} />
            <h1 className="ob-heading">Give {createdChild?.name} their first task</h1>
            <p className="ob-sub">They'll submit photo proof when done. You approve and they earn points.</p>

            {error && <p className="ob-error" role="alert">{error}</p>}

            {!customTask ? (
              <>
                <div className="ob-tile-grid">
                  {TASK_TILES.map((tile, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`ob-tile${selectedTile === i ? ' ob-tile--selected' : ''}`}
                      onClick={() => setSelectedTile(i)}
                    >
                      <span className="ob-tile-icon">{tile.icon}</span>
                      <span className="ob-tile-title">{tile.title}</span>
                      <span className="ob-tile-points">+{tile.points} RP</span>
                      {selectedTile === i && <span className="ob-tile-check">✓</span>}
                    </button>
                  ))}
                </div>
                <button className="ob-btn ob-btn--ghost ob-link" onClick={() => setCustomTask(true)}>
                  Or create a custom task
                </button>
              </>
            ) : (
              <>
                <div className="ob-field">
                  <label className="ob-label" htmlFor="ob-task-title">Task name</label>
                  <input
                    id="ob-task-title"
                    className="ob-input"
                    type="text"
                    placeholder="e.g. Vacuum the living room"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    maxLength={50}
                    autoFocus
                  />
                </div>
                <div className="ob-field">
                  <label className="ob-label" htmlFor="ob-task-desc">Description</label>
                  <input
                    id="ob-task-desc"
                    className="ob-input"
                    type="text"
                    placeholder="e.g. Vacuum the entire living room floor."
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="ob-field">
                  <label className="ob-label">Reward (RP)</label>
                  <div className="ob-points-row">
                    {POINTS_OPTIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`ob-points-btn${taskPoints === p ? ' ob-points-btn--selected' : ''}`}
                        onClick={() => setTaskPoints(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="ob-btn ob-btn--ghost ob-link" onClick={() => { setCustomTask(false); setSelectedTile(null); }}>
                  ← Back to suggestions
                </button>
              </>
            )}

            <div className="ob-callout ob-callout--info">
              <strong>What are RP?</strong> Regular Points - your child earns these by completing tasks and spends them on rewards you create.
            </div>

            <div className="ob-actions">
              <button className="ob-btn ob-btn--ghost ob-btn--back" onClick={back}>← Back</button>
              <button className="ob-btn ob-btn--primary" onClick={handleStep3} disabled={busy || (!customTask && selectedTile === null)}>
                {busy ? 'Creating…' : 'Create Task →'}
              </button>
            </div>
            <button className="ob-btn ob-btn--ghost" onClick={skip}>Skip for now</button>
          </>
        )}

        {/* ── Step 4: First reward ──────────────────────────────────────── */}
        {step === 4 && (
          <>
            <ProgressBar step={4} total={4} />
            <h1 className="ob-heading">What does {createdChild?.name} want to earn?</h1>
            <p className="ob-sub">Pick a reward to give them something to work towards.</p>

            {error && <p className="ob-error" role="alert">{error}</p>}

            <div className="ob-reward-row">
              <button
                type="button"
                className={`ob-reward-card${rewardType === 'gaming' ? ' ob-reward-card--selected' : ''}`}
                onClick={() => setRewardType('gaming')}
              >
                <strong className="ob-reward-name">Gaming Time (RP)</strong>
                <span className="ob-reward-desc">Let {createdChild?.name} earn extra gaming sessions using Regular Points - no money needed.</span>
              </button>
              <button
                type="button"
                className={`ob-reward-card${rewardType === 'giftcard' ? ' ob-reward-card--selected' : ''}`}
                onClick={() => setRewardType('giftcard')}
              >
                <strong className="ob-reward-name">Gift Card (GP)</strong>
                <span className="ob-reward-desc">Roblox, Steam, Razer Gold and more - funded by you via the Wallet tab.</span>
              </button>
            </div>

            {rewardType === 'gaming' && (
              <div className="ob-gaming-config">
                <div className="ob-field">
                  <label className="ob-label">Session duration</label>
                  <div className="ob-seg-row">
                    {[15, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`ob-seg-btn${gamingMinutes === m ? ' ob-seg-btn--selected' : ''}`}
                        onClick={() => setGamingMinutes(m)}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ob-field">
                  <label className="ob-label">RP cost</label>
                  <div className="ob-points-row">
                    {[25, 50, 75, 100].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`ob-points-btn${gamingCost === p ? ' ob-points-btn--selected' : ''}`}
                        onClick={() => setGamingCost(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="ob-preview-card">
                  <span className="ob-preview-label">Preview</span>
                  <span className="ob-preview-title">{gamingMinutes} min Gaming Session</span>
                  <span className="ob-preview-cost">{gamingCost} RP</span>
                </div>
              </div>
            )}

            {rewardType === 'giftcard' && (
              <div className="ob-callout ob-callout--info">
                The reward listing will be created now. You fund it by topping up your GP wallet from the Dashboard → Wallet tab.
              </div>
            )}

            <div className="ob-actions">
              <button className="ob-btn ob-btn--ghost ob-btn--back" onClick={back}>← Back</button>
              <button className="ob-btn ob-btn--primary" onClick={() => handleStep4(false)} disabled={busy || !rewardType}>
                {busy ? 'Finishing…' : 'Finish Setup'}
              </button>
            </div>
            <button className="ob-btn ob-btn--ghost" onClick={() => handleStep4(true)}>
              Skip - I'll add rewards later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
