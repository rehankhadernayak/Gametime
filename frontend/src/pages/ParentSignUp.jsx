import { useEffect, useRef, useState } from 'react';
import { GametimeLink, useAppRouter } from 'gametime-web-nav';
import { apiRequest } from '../api/client.js';

/* ── Constants ────────────────────────────────────────────────────────── */
const AGES = ['Under 1', ...Array.from({ length: 18 }, (_, i) => `${i + 1}`), '18+'];
const GRADES = [
  'Pre-K', 'Kindergarten',
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
  'Not in school'
];
const NUM_CHILDREN_OPTS = ['None (just setting up)', '1', '2', '3', '4', '5 or more'];
const CONCERN_OPTS = [
  'Too much screen time',
  'Inappropriate game content',
  'In-app purchases / spending',
  'Online social interactions',
  'Other'
];
const REFERRAL_OPTS = [
  'Social media',
  'Friend or family recommendation',
  'App store or search',
  'Blog, podcast, or article',
  'Other'
];

/* ── Password step ────────────────────────────────────────────────────── */
function PasswordStep({ answers, onCreated }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body:   { name: answers.name, email: answers.email, password }
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('gametime_signup_context', JSON.stringify({
          numChildren:    answers.numChildren    || '',
          children:       answers.children       || [],
          primaryConcern: answers.primaryConcern || '',
          referralSource: answers.referralSource || ''
        }));
        localStorage.setItem('gametime_new_parent', '1');
      }
      onCreated({ token: data.token, role: 'parent', user: data.parent });
    } catch (err) {
      setError(err.message || 'Could not create account. Please check your email and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signup-step">
      <div className="signup-step-question">
        <p className="signup-step-num">Final step</p>
        <h2 className="signup-step-label">Create a secure password</h2>
        <p className="signup-step-hint">At least 8 characters.</p>
      </div>
      <form onSubmit={handleSubmit} className="signup-password-fields">
        <label className="signup-field-label">
          Password
          <input type="password" className="signup-text-input" placeholder="At least 8 characters"
            value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        </label>
        <label className="signup-field-label">
          Confirm password
          <input type="password" className="signup-text-input" placeholder="Re-enter password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        {error && <p className="signup-field-error" role="alert">{error}</p>}
        <button type="submit" className="signup-next-btn" disabled={busy}>
          {busy ? 'Creating your account...' : 'Create My Account'}
        </button>
      </form>
    </div>
  );
}

/* ── Children table step ──────────────────────────────────────────────── */
function ChildrenTable({ count, data, onChange, onContinue }) {
  function update(idx, field, val) {
    const next = data.map((row, i) => i === idx ? { ...row, [field]: val } : row);
    onChange(next);
  }

  const allAgesSet = data.every((row) => row.age !== '');
  const canAdd     = data.length < 10;

  return (
    <div className="signup-step">
      <div className="signup-step-question">
        <p className="signup-step-num">Step 4 of 6</p>
        <h2 className="signup-step-label">Tell us about your children</h2>
        <p className="signup-step-hint">Age is required. Grade is optional.</p>
      </div>

      <div className="signup-children-table-wrap">
        <table className="signup-children-table">
          <thead>
            <tr>
              <th>Child</th>
              <th>Age <span className="required-star">*</span></th>
              <th>Grade <span className="optional-label">(optional)</span></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                <td className="child-label">Child {idx + 1}</td>
                <td>
                  <select
                    className="signup-table-select"
                    value={row.age}
                    onChange={(e) => update(idx, 'age', e.target.value)}
                  >
                    <option value="">Select age</option>
                    {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </td>
                <td>
                  <select
                    className="signup-table-select"
                    value={row.grade}
                    onChange={(e) => update(idx, 'grade', e.target.value)}
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {canAdd && (
          <button
            type="button"
            className="signup-add-child-btn"
            onClick={() => onChange([...data, { age: '', grade: '' }])}
          >
            + Add Another Child
          </button>
        )}
      </div>

      <button
        type="button"
        className="signup-next-btn"
        disabled={!allAgesSet}
        onClick={onContinue}
      >
        Continue
      </button>
      {!allAgesSet && <p className="signup-field-error">Please select an age for each child to continue.</p>}
    </div>
  );
}

/* ── MCQ with optional "Other" text reveal ────────────────────────────── */
function McqStep({ stepNum, label, hint, options, value, otherText, onChange, onOtherText, onContinue }) {
  const showOther = value === 'Other';
  const canContinue = value && (value !== 'Other' || otherText.trim());

  return (
    <div className="signup-step">
      <div className="signup-step-question">
        <p className="signup-step-num">{stepNum}</p>
        <h2 className="signup-step-label">{label}</h2>
        {hint && <p className="signup-step-hint">{hint}</p>}
      </div>

      <div className="signup-choices">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`signup-choice-btn${value === opt ? ' selected' : ''}`}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        ))}

        {showOther && (
          <input
            autoFocus
            type="text"
            className="signup-text-input signup-other-input"
            placeholder="Please specify..."
            value={otherText}
            onChange={(e) => onOtherText(e.target.value)}
          />
        )}

        {value && (
          <button
            type="button"
            className="signup-next-btn"
            disabled={!canContinue}
            onClick={onContinue}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function buildInitialChildren(numStr) {
  const counts = { 'None (just setting up)': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5 or more': 5 };
  const n = counts[numStr] ?? 1;
  return Array.from({ length: n }, () => ({ age: '', grade: '' }));
}

function resolveValue(selected, otherText) {
  return selected === 'Other' ? (otherText.trim() || 'Other') : selected;
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function ParentSignUp({ onAuth }) {
  const router = useAppRouter();
  const inputRef = useRef(null);

  /* STEP IDs: name → email → numChildren → children → concern → referral → password */
  const STEPS = ['name', 'email', 'numChildren', 'children', 'concern', 'referral', 'password'];

  const [stepIdx,      setStepIdx]      = useState(0);
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [numChildren,  setNumChildren]  = useState('');
  const [childrenData, setChildrenData] = useState([]);
  const [concern,      setConcern]      = useState('');
  const [concernOther, setConcernOther] = useState('');
  const [referral,     setReferral]     = useState('');
  const [referralOther,setReferralOther]= useState('');
  const [textVal,      setTextVal]      = useState('');
  const [textErr,      setTextErr]      = useState('');
  const [animating,    setAnimating]    = useState(false);

  const stepId  = STEPS[stepIdx];
  const isDone  = stepId === 'password';

  /* Total visible steps for progress (name, email, numChildren, [children if any], concern, referral, password) */
  const isNoChildren  = numChildren === 'None (just setting up)';
  const totalSteps    = isNoChildren ? 6 : 7;
  /* Map stepIdx to display number */
  const displayStep   = stepIdx + 1;
  const pct           = isDone ? 100 : Math.round((stepIdx / (STEPS.length - 1)) * 100);

  useEffect(() => {
    setTextVal(stepId === 'name' ? name : stepId === 'email' ? email : '');
    setTextErr('');
    setTimeout(() => inputRef.current?.focus(), 80);
  }, [stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    setAnimating(true);
    setTimeout(() => {
      setStepIdx((prev) => {
        let next = prev + 1;
        // Skip children table if no children
        if (STEPS[next] === 'children' && isNoChildren) next += 1;
        return next;
      });
      setAnimating(false);
    }, 200);
  }

  function handleTextNext(e) {
    e.preventDefault();
    const val = textVal.trim();
    if (!val) { setTextErr('Please fill in this field to continue.'); return; }
    if (stepId === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setTextErr('Please enter a valid email address.');
      return;
    }
    if (stepId === 'name')  setName(val);
    if (stepId === 'email') setEmail(val);
    setTextErr('');
    advance();
  }

  function handleNumChildrenSelect(opt) {
    setNumChildren(opt);
    const rows = buildInitialChildren(opt);
    setChildrenData(rows);
    setAnimating(true);
    setTimeout(() => { setStepIdx((p) => p + 1); setAnimating(false); }, 200);
  }

  function handleAuth(data) { onAuth(data); router.push('/parent/onboarding'); }

  const answers = {
    name, email, numChildren,
    children:       childrenData,
    primaryConcern: resolveValue(concern, concernOther),
    referralSource: resolveValue(referral, referralOther)
  };

  return (
    <div className="auth-split">
      {/* Left brand panel */}
      <div className="auth-split-panel">
        <div className="auth-brand-block">
          <div className="auth-brand-logo" aria-hidden="true" />
          <h1 className="auth-brand-name">Gametime</h1>
          <p className="auth-brand-tagline">Family gaming, fairly managed.</p>
        </div>
        <ul className="auth-features" aria-label="Key features">
          <li><span className="auth-feature-dot" aria-hidden="true" />6 quick questions, then your account is ready</li>
          <li><span className="auth-feature-dot" aria-hidden="true" />Tailored quests and rewards built around your family</li>
          <li><span className="auth-feature-dot" aria-hidden="true" />Full control over gaming time, rules, and settings</li>
        </ul>
      </div>

      {/* Right: step-by-step MCQ form */}
      <div className="auth-split-form signup-step-panel">
        {/* Progress bar */}
        <div className="signup-progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="signup-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        {!isDone && (
          <p className="signup-step-counter">Question {displayStep} of {totalSteps}</p>
        )}

        <div className={`signup-step-content${animating ? ' fade-out' : ''}`}>

          {/* NAME */}
          {stepId === 'name' && (
            <div className="signup-step">
              <div className="signup-step-question">
                <p className="signup-step-num">Step 1 of {totalSteps}</p>
                <h2 className="signup-step-label">What is your full name?</h2>
                <p className="signup-step-hint">We will use this to personalise your dashboard.</p>
              </div>
              <form className="signup-text-form" onSubmit={handleTextNext}>
                <input ref={inputRef} type="text" className="signup-text-input"
                  placeholder="e.g. Jane Smith" value={textVal}
                  onChange={(e) => { setTextVal(e.target.value); setTextErr(''); }} autoComplete="name" />
                {textErr && <p className="signup-field-error" role="alert">{textErr}</p>}
                <button type="submit" className="signup-next-btn" disabled={!textVal.trim()}>Continue</button>
              </form>
            </div>
          )}

          {/* EMAIL */}
          {stepId === 'email' && (
            <div className="signup-step">
              <div className="signup-step-question">
                <p className="signup-step-num">Step 2 of {totalSteps}</p>
                <h2 className="signup-step-label">What is your email address?</h2>
                <p className="signup-step-hint">Your login email. We never share it.</p>
              </div>
              <form className="signup-text-form" onSubmit={handleTextNext}>
                <input ref={inputRef} type="email" className="signup-text-input"
                  placeholder="e.g. jane@example.com" value={textVal}
                  onChange={(e) => { setTextVal(e.target.value); setTextErr(''); }} autoComplete="email" />
                {textErr && <p className="signup-field-error" role="alert">{textErr}</p>}
                <button type="submit" className="signup-next-btn" disabled={!textVal.trim()}>Continue</button>
              </form>
            </div>
          )}

          {/* NUMBER OF CHILDREN */}
          {stepId === 'numChildren' && (
            <div className="signup-step">
              <div className="signup-step-question">
                <p className="signup-step-num">Step 3 of {totalSteps}</p>
                <h2 className="signup-step-label">How many children will use Gametime?</h2>
                <p className="signup-step-hint">You can add more later in Settings.</p>
              </div>
              <div className="signup-choices">
                {NUM_CHILDREN_OPTS.map((opt) => (
                  <button key={opt} type="button"
                    className={`signup-choice-btn${numChildren === opt ? ' selected' : ''}`}
                    onClick={() => handleNumChildrenSelect(opt)}
                  >{opt}</button>
                ))}
              </div>
            </div>
          )}

          {/* CHILDREN TABLE */}
          {stepId === 'children' && (
            <ChildrenTable
              count={childrenData.length}
              data={childrenData}
              onChange={setChildrenData}
              onContinue={advance}
            />
          )}

          {/* PRIMARY CONCERN */}
          {stepId === 'concern' && (
            <McqStep
              stepNum={`Step ${isNoChildren ? 4 : 5} of ${totalSteps}`}
              label="What is your biggest concern about your kids' gaming?"
              options={CONCERN_OPTS}
              value={concern}
              otherText={concernOther}
              onChange={setConcern}
              onOtherText={setConcernOther}
              onContinue={advance}
            />
          )}

          {/* REFERRAL SOURCE */}
          {stepId === 'referral' && (
            <McqStep
              stepNum={`Step ${isNoChildren ? 5 : 6} of ${totalSteps}`}
              label="How did you hear about Gametime?"
              options={REFERRAL_OPTS}
              value={referral}
              otherText={referralOther}
              onChange={setReferral}
              onOtherText={setReferralOther}
              onContinue={advance}
            />
          )}

          {/* PASSWORD */}
          {isDone && <PasswordStep answers={answers} onCreated={handleAuth} />}
        </div>

        <p className="signup-login-link">
          Already have an account? <GametimeLink href="/login">Log in</GametimeLink>
        </p>
      </div>
    </div>
  );
}
