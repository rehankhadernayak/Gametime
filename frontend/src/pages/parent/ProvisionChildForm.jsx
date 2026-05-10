import { useMemo, useState } from 'react';
import { apiRequest } from '../../api/client.js';
import { BrutalistCard } from '../../components/ui/BrutalistCard.jsx';
import { BrutalistInput } from '../../components/ui/BrutalistInput.jsx';
import { TypewriterHeading } from '../../components/ui/TypewriterHeading.jsx';

function getAgeYears(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) years -= 1;
  return years;
}

async function grantInitialRewardPoints(childId, totalRp, token) {
  let remaining = Math.min(10000, Math.max(0, Math.floor(Number(totalRp) || 0)));
  const NOTE = 'INITIAL_OPERATIVE_CREDIT';
  while (remaining > 0) {
    const chunk = Math.min(remaining, 1000);
    await apiRequest('/points/adjust', {
      method: 'POST',
      token,
      body: { childId, points: chunk, note: NOTE }
    });
    remaining -= chunk;
  }
}

/**
 * Terminal-style provision flow. Maps to POST /children/create (+ optional RP grants).
 */
export default function ProvisionChildForm({ token, onCancel, onFinished }) {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initialRp, setInitialRp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const age = useMemo(() => getAgeYears(dateOfBirth), [dateOfBirth]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    if (!trimmedName || !dateOfBirth) {
      setError('NAME_AND_DATE_REQUIRED');
      return;
    }
    if (age != null && (age < 6 || age > 13)) {
      setError('AGE_GATE_6_13');
      return;
    }

    const hasEmail = Boolean(email.trim());
    const hasPassword = Boolean(password.trim());
    const hasPin = Boolean(pin.trim());

    if (hasPin && !/^\d{4}$/.test(pin.trim())) {
      setError('PIN_MUST_BE_4_DIGITS');
      return;
    }
    if (hasEmail !== hasPassword) {
      setError('EMAIL_PASSWORD_PAIR_REQUIRED');
      return;
    }
    if (age != null && age > 9 && (!hasEmail || !hasPassword)) {
      setError('OLDER_CHILD_REQUIRES_EMAIL_PASSWORD');
      return;
    }
    if (age != null && age > 9 && hasPin) {
      setError('PIN_NOT_ALLOWED_10_PLUS');
      return;
    }
    if (age != null && age <= 9 && !hasPin && !(hasEmail && hasPassword)) {
      setError('YOUNGER_REQUIRES_PIN_OR_EMAIL');
      return;
    }

    let parsedInitial = 0;
    if (String(initialRp).trim() !== '') {
      parsedInitial = Number(initialRp);
      if (Number.isNaN(parsedInitial) || parsedInitial < 0) {
        setError('INITIAL_RP_INVALID');
        return;
      }
      if (parsedInitial > 10000) {
        setError('INITIAL_RP_MAX_10000');
        return;
      }
    }

    setBusy(true);
    try {
      const body = {
        name: trimmedName,
        dateOfBirth,
        email: hasEmail ? email.trim() : null,
        password: hasPassword ? password : null,
        pin: hasPin ? pin.trim() : null
      };
      const created = await apiRequest('/children/create', { method: 'POST', token, body });
      if (parsedInitial > 0 && created?.id) {
        await grantInitialRewardPoints(created.id, parsedInitial, token);
      }
      onFinished?.({ name: trimmedName, id: created?.id });
      setName('');
      setDateOfBirth('');
      setPin('');
      setEmail('');
      setPassword('');
      setInitialRp('');
    } catch (err) {
      setError(err.message || 'PROVISION_FAILED');
    } finally {
      setBusy(false);
    }
  }

  const showOlderFields = age != null && age >= 10;

  return (
    <div className="space-y-6">
      <TypewriterHeading className="font-mono text-base sm:text-lg text-black mb-2 block">
        PROVISION_NEW_OPERATIVE
      </TypewriterHeading>

      <BrutalistCard className="bg-white">
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-black/70 border-b-2 border-black pb-3">
            {'>'} ENTER_CREDENTIALS — ALL_FIELDS_VALIDATED_SERVER_SIDE
          </p>

          <div>
            <label className="parent-led-field-label" htmlFor="prov-name">
              OPERATIVE_NAME
            </label>
            <BrutalistInput
              id="prov-name"
              name="operative_name"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder="—"
              className="font-mono text-sm"
            />
          </div>

          <div>
            <label className="parent-led-field-label" htmlFor="prov-dob">
              DATE_OF_BIRTH (ISO)
            </label>
            <BrutalistInput
              id="prov-dob"
              type="date"
              name="date_of_birth"
              value={dateOfBirth}
              onChange={(ev) => setDateOfBirth(ev.target.value)}
              className="font-mono text-sm"
            />
            {age != null ? (
              <p className="mt-2 mb-0 font-mono text-[10px] uppercase tracking-wide text-black/60">
                CALC_AGE: {age} — {age <= 9 ? 'PIN_ELIGIBLE' : 'EMAIL_AUTH_REQUIRED'}
              </p>
            ) : null}
          </div>

          {!showOlderFields ? (
            <div>
              <label className="parent-led-field-label" htmlFor="prov-pin">
                PIN_CODE (LOGIN)
              </label>
              <BrutalistInput
                id="prov-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                name="pin"
                value={pin}
                onChange={(ev) => setPin(ev.target.value)}
                placeholder="0000"
                autoComplete="new-password"
                className="font-mono text-sm tracking-widest"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="parent-led-field-label" htmlFor="prov-email">
                  CHILD_EMAIL
                </label>
                <BrutalistInput
                  id="prov-email"
                  type="email"
                  name="child_email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="parent-led-field-label" htmlFor="prov-pw">
                  CHILD_PASSWORD
                </label>
                <BrutalistInput
                  id="prov-pw"
                  type="password"
                  name="child_password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          <div>
            <label className="parent-led-field-label" htmlFor="prov-rp">
              INITIAL_TIME_BALANCE (RP)
            </label>
            <BrutalistInput
              id="prov-rp"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              name="initial_rp"
              value={initialRp}
              onChange={(ev) => setInitialRp(ev.target.value)}
              placeholder="0"
              className="font-mono text-sm"
            />
            <p className="mt-2 mb-0 font-mono text-[10px] uppercase tracking-wide text-black/55 leading-snug">
              RP_FUNDS_GAMING_MINUTES_PER_FAMILY_CONVERSION_RULES.
            </p>
          </div>

          {error ? (
            <p className="m-0 font-mono text-xs uppercase text-red-700 border-2 border-black px-3 py-2 bg-black/[0.03]" role="alert">
              ERR: {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className="parent-brutal-exec-btn flex-1 min-w-[140px]" disabled={busy}>
              {busy ? 'COMMITTING…' : 'EXEC_COMMIT'}
            </button>
            <button type="button" className="parent-brutal-secondary-btn" onClick={onCancel} disabled={busy}>
              ABORT
            </button>
          </div>
        </form>
      </BrutalistCard>
    </div>
  );
}
