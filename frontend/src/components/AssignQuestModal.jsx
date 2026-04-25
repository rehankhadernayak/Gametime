import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import ParentTheme from './ParentTheme.jsx';
import GTCard from './GTCard.jsx';
import GTInput from './GTInput.jsx';

const STEPS = ['Quest', 'Rewards', 'Launch'];

function defaultDueIso() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(23, 59, 0, 0);
  return d.toISOString().slice(0, 16);
}

function buildDescription(title) {
  const t = String(title || '').trim();
  if (!t) return '';
  return `Complete "${t}" and upload the required proof before the due time. Parent will review and award RP.`;
}

export default function AssignQuestModal({ token, children, defaultChildId, onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [childId, setChildId] = useState(defaultChildId || children[0]?.id || '');
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(10);
  const [dueLocal, setDueLocal] = useState(defaultDueIso().slice(0, 16));
  const [requiredEvidenceType, setRequiredEvidenceType] = useState('Photo');
  const [gpPoints, setGpPoints] = useState(0);
  const [category, setCategory] = useState('chores');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!childId && children[0]?.id) setChildId(children[0].id);
  }, [childId, children]);

  const description = useMemo(() => buildDescription(title), [title]);
  const selectedChild = children.find((c) => c.id === childId);

  async function submit() {
    setError('');
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Quest name is required.');
      setStep(0);
      return;
    }
    if (!childId) {
      setError('Select a child first.');
      return;
    }
    const pts = Number(points);
    if (!Number.isInteger(pts) || pts < 5 || pts > 50) {
      setError('RP must be between 5 and 50.');
      setStep(1);
      return;
    }
    const gp = Number(gpPoints);
    if (!Number.isInteger(gp) || gp < 0 || gp > 1000) {
      setError('GP bonus must be 0–1000.');
      setStep(1);
      return;
    }
    const dueTs = Date.parse(dueLocal);
    if (!dueTs || dueTs <= Date.now()) {
      setError('Due date must be in the future.');
      setStep(1);
      return;
    }
    if (dueTs > Date.now() + 7 * 24 * 60 * 60 * 1000) {
      setError('Due date must be within the next 7 days.');
      setStep(1);
      return;
    }

    const desc = buildDescription(trimmed);
    if (desc.length < 1 || desc.length > 200) {
      setError('Description would be invalid. Shorten the quest name.');
      return;
    }

    setBusy(true);
    try {
      await apiRequest('/tasks/create', {
        method: 'POST',
        token,
        body: {
          childId,
          title: trimmed.slice(0, 50),
          description: desc.slice(0, 200),
          points: pts,
          gpPoints: gp,
          dueDate: new Date(dueTs).toISOString(),
          category,
          recurrenceDays: null,
          requiredEvidenceType
        }
      });
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not assign quest.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="quest-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="quest-modal" role="dialog" aria-modal="true" aria-labelledby="quest-modal-title">
        <ParentTheme className="quest-modal-inner">
          <div className="quest-modal-top">
            <div>
              <p className="quest-modal-kicker">New assignment</p>
              <h2 id="quest-modal-title" className="quest-modal-title">Assign a New Quest</h2>
            </div>
            <button type="button" className="icon-button quest-modal-close" aria-label="Close" onClick={() => onClose?.()}>
              ×
            </button>
          </div>

          <nav className="quest-stepper" aria-label="Quest steps">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`quest-stepper-btn${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
                onClick={() => { if (i <= step) setStep(i); }}
              >
                <span className="quest-step-num">{i + 1}</span>
                {label}
              </button>
            ))}
          </nav>

          {error ? <p className="error quest-modal-error" role="alert">{error}</p> : null}

          {step === 0 && (
            <GTCard title="Who & what" subtitle="Choose the hero and name this quest.">
              <div className="gt-stack">
                <div className="gt-field">
                  <label className="gt-input-label" htmlFor="quest-child">Assign to</label>
                  <select id="quest-child" className="gt-input gt-select" value={childId} onChange={(e) => setChildId(e.target.value)}>
                    {children.length === 0 ? <option value="">No children yet</option> : null}
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <GTInput
                  label="Quest name"
                  hint="Shown on your child’s list (max 50 characters)."
                  maxLength={50}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kitchen cleanup sweep"
                  autoFocus
                />
              </div>
            </GTCard>
          )}

          {step === 1 && (
            <GTCard title="Rewards & proof" subtitle="RP is awarded after you approve their submission.">
              <div className="gt-stack">
                <div className="gt-field-row">
                  <GTInput
                    label="RP reward"
                    type="number"
                    min={5}
                    max={50}
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                  />
                  <GTInput
                    label="GP bonus (optional)"
                    hint="Reserved from your GP when the quest is created."
                    type="number"
                    min={0}
                    max={1000}
                    value={gpPoints}
                    onChange={(e) => setGpPoints(e.target.value)}
                  />
                </div>
                <div className="gt-field">
                  <label className="gt-input-label" htmlFor="quest-due">Due date & time</label>
                  <input
                    id="quest-due"
                    type="datetime-local"
                    className="gt-input"
                    value={dueLocal}
                    onChange={(e) => setDueLocal(e.target.value)}
                  />
                  <p className="gt-input-hint">Must be within the next 7 days.</p>
                </div>
                <fieldset className="gt-proof-fieldset">
                  <legend className="gt-input-label">Proof required</legend>
                  <div className="gt-segmented">
                    <button
                      type="button"
                      className={requiredEvidenceType === 'Photo' ? 'active' : ''}
                      onClick={() => setRequiredEvidenceType('Photo')}
                    >
                      Photo
                    </button>
                    <button
                      type="button"
                      className={requiredEvidenceType === 'Video' ? 'active' : ''}
                      onClick={() => setRequiredEvidenceType('Video')}
                    >
                      Video
                    </button>
                  </div>
                </fieldset>
                <div className="gt-field">
                  <label className="gt-input-label" htmlFor="quest-cat">Category</label>
                  <select id="quest-cat" className="gt-input gt-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="chores">Chores</option>
                    <option value="school">School</option>
                    <option value="activities">Activities</option>
                    <option value="health">Health</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </GTCard>
          )}

          {step === 2 && (
            <GTCard title="Review" subtitle="We’ll send your child a notification when the quest goes live.">
              <dl className="quest-review-dl">
                <div><dt>Child</dt><dd>{selectedChild?.name || '—'}</dd></div>
                <div><dt>Quest</dt><dd>{title.trim() || '—'}</dd></div>
                <div><dt>RP</dt><dd>{points}</dd></div>
                <div><dt>GP</dt><dd>{gpPoints || 0}</dd></div>
                <div><dt>Due</dt><dd>{dueLocal ? new Date(dueLocal).toLocaleString() : '—'}</dd></div>
                <div><dt>Proof</dt><dd>{requiredEvidenceType}</dd></div>
              </dl>
              <p className="gt-input-hint quest-review-preview-label">Instructions preview</p>
              <p className="quest-review-desc">{description || '—'}</p>
            </GTCard>
          )}

          <div className="quest-modal-actions">
            {step > 0 ? (
              <button type="button" className="secondary-button" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 2 ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setError('');
                  if (step === 0 && !title.trim()) {
                    setError('Enter a quest name.');
                    return;
                  }
                  if (step === 0 && !childId) {
                    setError('Add a child account first.');
                    return;
                  }
                  setStep((s) => s + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={() => submit()} disabled={busy || children.length === 0}>
                {busy ? 'Assigning…' : 'Assign quest'}
              </button>
            )}
          </div>
        </ParentTheme>
      </div>
    </div>
  );
}
