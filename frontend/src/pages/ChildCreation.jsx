import { useState } from 'react';

export default function ChildCreation({ token, onCreate }) {
  const [form, setForm] = useState({ name: '', dateOfBirth: '', email: '', password: '', pin: '' });
  const [error, setError] = useState('');
  const age = form.dateOfBirth
    ? (() => {
      const dob = new Date(form.dateOfBirth);
      const now = new Date();
      let years = now.getUTCFullYear() - dob.getUTCFullYear();
      const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) years -= 1;
      return years;
    })()
    : null;

  return (
    <div className="panel">
      <h2>Create Child Account</h2>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');

          if (!form.name.trim() || !form.dateOfBirth) {
            setError('Child name and date of birth are required');
            return;
          }

          const hasEmail = Boolean(form.email.trim());
          const hasPassword = Boolean(form.password.trim());
          const hasPin = Boolean(form.pin.trim());

          if (hasEmail !== hasPassword) {
            setError('Email and password must both be filled if you want child login.');
            return;
          }
          if (hasPin && !/^\d{4}$/.test(form.pin.trim())) {
            setError('PIN must be exactly 4 digits.');
            return;
          }
          if (age !== null && age > 9 && (!hasEmail || !hasPassword)) {
            setError('For children age 10+, email and password are required.');
            return;
          }
          if (age !== null && age > 9 && hasPin) {
            setError('PIN mode is only available for younger children (9 and below).');
            return;
          }
          if (age !== null && age <= 9 && !hasPin && !(hasEmail && hasPassword)) {
            setError('For younger children, provide either a 4-digit PIN or email/password.');
            return;
          }

          try {
            await onCreate(
              {
                name: form.name.trim(),
                dateOfBirth: form.dateOfBirth,
                email: hasEmail ? form.email.trim() : null,
                password: hasPassword ? form.password : null,
                pin: hasPin ? form.pin.trim() : null
              },
              token
            );
            setForm({ name: '', dateOfBirth: '', email: '', password: '', pin: '' });
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <label>
          Child Name
          <input placeholder="Child name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Date of Birth
          <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
        </label>
        {age !== null ? (
          <p>{age <= 9 ? 'Detected younger child (<=9): PIN or email/password is allowed.' : 'Detected older child (10+): email/password is required.'}</p>
        ) : null}
        <label>
          Child Email (optional for younger child)
          <input type="email" placeholder="Child email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Child Password (required for age 10+)
          <input type="password" placeholder="Child password (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label>
          4-digit PIN (younger kids only)
          <input type="password" inputMode="numeric" pattern="[0-9]{4}" placeholder="4-digit PIN (younger kids)" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
        </label>
        <button type="submit">Add Child</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
