import { useEffect, useRef, useState } from 'react';
import { useAppRouter } from 'gametime-web-nav';
import { API_BASE, apiRequest } from '../../api/client.js';
import GTConfirmDialog from '../../components/GTConfirmDialog.jsx';
import { BrutalistCard } from '../../components/ui/BrutalistCard.jsx';
import { BrutalistInput } from '../../components/ui/BrutalistInput.jsx';
import { TypewriterHeading } from '../../components/ui/TypewriterHeading.jsx';
import ProvisionChildForm from './ProvisionChildForm.jsx';
import '../auth-brutal.css';
import './parent-settings.css';

function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function getAgeYears(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) years -= 1;
  return years;
}

function randomFourDigitPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function notifyDeletionSuccess(title, message) {
  window.dispatchEvent(
    new CustomEvent('gametime:toast', {
      detail: { type: 'success', title, message }
    })
  );
}

function LedgerRow({ k, v, children }) {
  return (
    <div className="parent-led-row">
      <span className="parent-led-row-key">{k}</span>
      <div className="parent-led-row-val font-mono">{children ?? v}</div>
    </div>
  );
}

function BrutalToggleRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className={`parent-led-row items-center${disabled ? ' opacity-50' : ''}`}>
      <div>
        <div className="parent-led-row-key">{label}</div>
        {description ? (
          <p className="m-0 mt-1 max-w-md font-mono text-[10px] normal-case tracking-normal opacity-70">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`parent-brutal-switch${checked ? ' on' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className="parent-brutal-switch-thumb" />
      </button>
    </div>
  );
}

export default function ParentSettingsPage({ token, parentName, theme, onToggleTheme }) {
  const router = useAppRouter();

  const [me, setMe] = useState(null);
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [showProvision, setShowProvision] = useState(false);
  const [childMsg, setChildMsg] = useState('');
  const [childMsgKind, setChildMsgKind] = useState('success');
  const [pinByChildId, setPinByChildId] = useState({});
  const [pinSavingId, setPinSavingId] = useState('');

  const [fontSize, setFontSize] = useState('medium');
  const [notif, setNotif] = useState({
    enabled: true,
    taskApprovals: true,
    childActivity: true,
    weeklyReport: true,
    reminderSchedule: 'daily'
  });
  const [notifSaveStatus, setNotifSaveStatus] = useState('');
  const notifInitialised = useRef(false);
  const notifSaveTimer = useRef(null);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);

  const [exportBusy, setExportBusy] = useState(false);
  const [showDeleteAccountGate, setShowDeleteAccountGate] = useState(false);
  const [showDeletePasswordForm, setShowDeletePasswordForm] = useState(false);
  const [removeChildTarget, setRemoveChildTarget] = useState(null);
  const [removeChildBusy, setRemoveChildBusy] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    try {
      const fs = localStorage.getItem('gametime_font_size');
      if (fs === 'small' || fs === 'medium' || fs === 'large') setFontSize(fs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/auth/me', { token });
        if (data?.user) setMe(data.user);
      } catch {
        // ignore
      }
    })();
  }, [token]);

  useEffect(() => {
    loadChildren();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const scale = fontSize === 'small' ? '0.88' : fontSize === 'large' ? '1.12' : '1';
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem('gametime_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/notifications/preferences', { token });
        setNotif(data);
      } catch {
        // ignore
      } finally {
        notifInitialised.current = true;
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notifInitialised.current) return;
    clearTimeout(notifSaveTimer.current);
    setNotifSaveStatus('saving');
    notifSaveTimer.current = setTimeout(async () => {
      try {
        await apiRequest('/notifications/preferences', { method: 'PATCH', token, body: notif });
        setNotifSaveStatus('saved');
        setTimeout(() => setNotifSaveStatus(''), 2000);
      } catch {
        setNotifSaveStatus('error');
      }
    }, 600);
  }, [notif]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadChildren() {
    setChildrenLoading(true);
    try {
      const data = await apiRequest('/children/list', { token });
      setChildren(Array.isArray(data) ? data : []);
    } catch {
      setChildren([]);
    } finally {
      setChildrenLoading(false);
    }
  }

  function notifyChild(msg, kind = 'success') {
    setChildMsg(msg);
    setChildMsgKind(kind);
    setTimeout(() => setChildMsg(''), 4000);
  }

  async function handleGeneratePin(childId) {
    const pin = randomFourDigitPin();
    setPinSavingId(childId);
    try {
      await apiRequest(`/children/${childId}/pin`, { method: 'PATCH', token, body: { pin } });
      setPinByChildId((prev) => ({ ...prev, [childId]: pin }));
      notifyChild('New PIN saved. Share it with your child once, then store it safely.', 'success');
    } catch (err) {
      notifyChild(err.message || 'Could not update PIN.', 'error');
    } finally {
      setPinSavingId('');
    }
  }

  async function handleDeleteChildConfirmed() {
    if (!removeChildTarget) return;
    const { id, name } = removeChildTarget;
    setRemoveChildBusy(true);
    try {
      await apiRequest(`/children/${id}`, { method: 'DELETE', token });
      setRemoveChildTarget(null);
      notifyDeletionSuccess('Child removed', `${name} was removed from your account.`);
      notifyChild(`${name} removed.`);
      await loadChildren();
    } catch (err) {
      notifyChild(err.message || 'Could not remove child.', 'error');
    } finally {
      setRemoveChildBusy(false);
    }
  }

  async function handleExportData() {
    setExportBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/export-data`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gametime-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Could not export data. Please try again.');
    } finally {
      setExportBusy(false);
    }
  }

  async function handleDeleteAccount(e) {
    e.preventDefault();
    setDeleteBusy(true);
    setDeleteMsg('');
    try {
      await apiRequest('/auth/account', { method: 'DELETE', token, body: { password: deletePassword } });
      notifyDeletionSuccess('Account deleted', 'Your Gametime account and family data have been removed.');
      localStorage.clear();
      window.location.href = '/';
    } catch (err) {
      setDeleteMsg(err.message || 'Could not delete account. Check your password and try again.');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPwd.length < 8) {
      setPwdMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPwd !== confPwd) {
      setPwdMsg('New passwords do not match.');
      return;
    }
    setPwdBusy(true);
    setPwdMsg('');
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        token,
        body: { currentPassword: curPwd, newPassword: newPwd }
      });
      setPwdMsg('Password changed successfully.');
      setCurPwd('');
      setNewPwd('');
      setConfPwd('');
    } catch (err) {
      setPwdMsg(err.message || 'Could not change password.');
    } finally {
      setPwdBusy(false);
    }
  }

  const displayName = me?.name || parentName || '—';
  const displayEmail = me?.email || '—';
  const gpWallet = me?.gpBalance != null ? String(me.gpBalance) : '—';

  return (
    <div className="parent-brutal-settings relative">
      <div className="ascii-bg fixed inset-0 z-0 pointer-events-none" aria-hidden />
      <GTConfirmDialog
        open={Boolean(removeChildTarget)}
        title={removeChildTarget ? `Remove ${removeChildTarget.name}?` : 'Remove child?'}
        description="This action cannot be undone. All associated progress will be lost."
        cancelLabel="Cancel"
        confirmLabel="Confirm Delete"
        confirmBusy={removeChildBusy}
        onCancel={() => !removeChildBusy && setRemoveChildTarget(null)}
        onConfirm={handleDeleteChildConfirmed}
      />
      <GTConfirmDialog
        open={showDeleteAccountGate}
        title="Delete your family account?"
        description={
          'This action is permanent. It will remove every child profile, all task history, and unused playtime minutes for your household. '
          + 'All data will be removed from our servers within 24 hours to comply with privacy regulations.'
        }
        cancelLabel="Cancel"
        confirmLabel="Continue"
        onCancel={() => setShowDeleteAccountGate(false)}
        onConfirm={() => {
          setShowDeleteAccountGate(false);
          setShowDeletePasswordForm(true);
          setDeleteMsg('');
          setDeletePassword('');
        }}
      />

      <div className="relative z-[1]">
        <header className="parent-brutal-page-header flex flex-wrap items-center gap-4 border-b-2 border-black bg-white">
          <button
            type="button"
            className="parent-brutal-secondary-btn inline-flex items-center gap-2"
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <IconBack />
            BACK
          </button>
          <TypewriterHeading className="font-mono text-lg sm:text-xl text-black flex-1 min-w-0 shrink">
            CONTROL_LEDGER
          </TypewriterHeading>
          <span className="font-mono text-[10px] uppercase tracking-widest text-black/60 hidden sm:inline">
            OP: {(displayName || '').split(' ')[0] || 'USER'}
          </span>
        </header>

        <main className="parent-brutal-main space-y-12">
          {/* Ledger */}
          <section aria-labelledby="ledger-heading">
            <h2 id="ledger-heading" className="parent-led-section-code">
              GLOBAL_LEDGER
            </h2>

            <BrutalistCard className="bg-white mb-8">
              <h3 className="parent-led-section-code border-b-2 border-black pb-3 mb-2">
                ACCOUNT_DETAILS
              </h3>
              <LedgerRow k="DISPLAY_NAME" v={displayName} />
              <LedgerRow k="EMAIL" v={displayEmail} />
              <LedgerRow k="ACCESS_ID" v={me?.id ? `${me.id.slice(0, 8)}…` : '—'} />

              <div className="mt-6 pt-4 border-t-2 border-black">
                <p className="parent-led-field-label mb-3">AUTH_ROTATION</p>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div>
                    <label className="parent-led-field-label" htmlFor="pwd-cur">
                      CURRENT_SECRET
                    </label>
                    <BrutalistInput
                      id="pwd-cur"
                      type="password"
                      autoComplete="current-password"
                      value={curPwd}
                      onChange={(e) => setCurPwd(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="parent-led-field-label" htmlFor="pwd-new">
                      NEW_SECRET
                    </label>
                    <BrutalistInput
                      id="pwd-new"
                      type="password"
                      autoComplete="new-password"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      minLength={8}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="parent-led-field-label" htmlFor="pwd-conf">
                      CONFIRM_NEW_SECRET
                    </label>
                    <BrutalistInput
                      id="pwd-conf"
                      type="password"
                      autoComplete="new-password"
                      value={confPwd}
                      onChange={(e) => setConfPwd(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  {pwdMsg ? (
                    <p className={`m-0 font-mono text-xs uppercase ${pwdMsg.includes('successfully') ? 'text-green-800' : 'text-red-700'}`} role="alert">
                      {pwdMsg}
                    </p>
                  ) : null}
                  <button type="submit" className="parent-brutal-exec-btn" disabled={pwdBusy}>
                    {pwdBusy ? 'UPDATING…' : 'COMMIT_SECRET_ROTATION'}
                  </button>
                </form>
              </div>

              <div className="mt-8 pt-6 border-t-2 border-black space-y-4">
                <p className="parent-led-field-label">DATA_SOVEREIGNTY</p>
                <div className="parent-led-row">
                  <span className="parent-led-row-key">JSON_ARCHIVE_EXPORT</span>
                  <button type="button" className="parent-brutal-secondary-btn" onClick={handleExportData} disabled={exportBusy}>
                    {exportBusy ? 'PREPARING…' : 'DOWNLOAD'}
                  </button>
                </div>

                {!showDeletePasswordForm ? (
                  <button
                    type="button"
                    className="parent-brutal-danger-btn w-full border-dashed"
                    onClick={() => {
                      setShowDeleteAccountGate(true);
                      setDeleteMsg('');
                      setDeletePassword('');
                    }}
                  >
                    PURGE_FAMILY_ACCOUNT
                  </button>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-3 border-2 border-black p-4 bg-black/[0.02]">
                    <p className="m-0 font-mono text-[11px] uppercase tracking-wide">
                      CONFIRM_PURGE_WITH_PARENT_SECRET
                    </p>
                    <BrutalistInput
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                      className="font-mono text-sm"
                    />
                    {deleteMsg ? (
                      <p className="m-0 font-mono text-xs uppercase text-red-700" role="alert">
                        {deleteMsg}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="parent-brutal-secondary-btn" onClick={() => setShowDeletePasswordForm(false)}>
                        CANCEL
                      </button>
                      <button type="submit" className="parent-brutal-danger-btn flex-1" disabled={deleteBusy}>
                        {deleteBusy ? 'PURGING…' : 'EXEC_PURGE'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </BrutalistCard>

            <BrutalistCard className="bg-white mb-8">
              <h3 className="parent-led-section-code border-b-2 border-black pb-3 mb-2">
                BILLING_STATUS
              </h3>
              <LedgerRow k="GIFT_CARD_POINTS" v={`${gpWallet} GP`} />
              <LedgerRow k="STRIPE_TOP_UP" v="MODULE_IDLE" />
              <p className="m-0 mt-3 font-mono text-[10px] uppercase tracking-wide text-black/55 leading-relaxed">
                AUTOMATED_BILLING_AND_GP_PURCHASES_ARE_PLANNED_GP_IS_TRACKED_ABOVE.
              </p>
            </BrutalistCard>

            <BrutalistCard className="bg-white">
              <h3 className="parent-led-section-code border-b-2 border-black pb-3 mb-2">
                SYSTEM_PREFS
              </h3>

              {typeof onToggleTheme === 'function' ? (
                <div className="parent-led-row items-center border-b-2 border-black">
                  <span className="parent-led-row-key">COLOR_MODE</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`parent-brutal-choice${theme === 'light' ? ' active' : ''}`}
                      onClick={() => theme !== 'light' && onToggleTheme()}
                    >
                      LIGHT
                    </button>
                    <button
                      type="button"
                      className={`parent-brutal-choice${theme === 'dark' ? ' active' : ''}`}
                      onClick={() => theme !== 'dark' && onToggleTheme()}
                    >
                      DARK
                    </button>
                  </div>
                </div>
              ) : (
                <LedgerRow k="COLOR_MODE" v={theme || '—'} />
              )}

              <div className="py-3 border-b-2 border-black">
                <span className="parent-led-row-key block mb-2">FONT_SCALE</span>
                <div className="flex flex-wrap gap-2">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`parent-brutal-choice${fontSize === size ? ' active' : ''}`}
                      onClick={() => setFontSize(size)}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-0">
                <p className="parent-led-field-label mb-2">ALERT_MATRIX</p>
                <BrutalToggleRow
                  label="CHANNEL_MASTER"
                  description="Master switch for notification delivery."
                  checked={notif.enabled}
                  onChange={(v) => setNotif((p) => ({ ...p, enabled: v }))}
                />
                <BrutalToggleRow
                  label="TASK_APPROVALS"
                  checked={notif.taskApprovals}
                  onChange={(v) => setNotif((p) => ({ ...p, taskApprovals: v }))}
                  disabled={!notif.enabled}
                />
                <BrutalToggleRow
                  label="CHILD_ACTIVITY"
                  checked={notif.childActivity}
                  onChange={(v) => setNotif((p) => ({ ...p, childActivity: v }))}
                  disabled={!notif.enabled}
                />
                <BrutalToggleRow
                  label="WEEKLY_DIGEST"
                  checked={notif.weeklyReport}
                  onChange={(v) => setNotif((p) => ({ ...p, weeklyReport: v }))}
                  disabled={!notif.enabled}
                />
              </div>

              <div className="py-4 border-b-2 border-black">
                <span className="parent-led-row-key block mb-2">REMINDER_SCHEDULE</span>
                <div className="flex flex-wrap gap-2">
                  {['off', 'daily', 'weekly'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`parent-brutal-choice${notif.reminderSchedule === s ? ' active' : ''}`}
                      onClick={() => setNotif((p) => ({ ...p, reminderSchedule: s }))}
                      disabled={!notif.enabled}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <p className="m-0 mt-3 font-mono text-[10px] uppercase tracking-wide text-black/60">
                {notifSaveStatus === 'saving' && 'SYNC_STATE: WRITING…'}
                {notifSaveStatus === 'saved' && 'SYNC_STATE: ACK'}
                {notifSaveStatus === 'error' && 'SYNC_STATE: ERR'}
                {!notifSaveStatus && 'SYNC_STATE: IDLE (AUTO)'}
              </p>
            </BrutalistCard>
          </section>

          {/* Field roster */}
          <section aria-labelledby="roster-heading">
            <h2 id="roster-heading" className="parent-led-section-code">
              FIELD_ROSTER
            </h2>

            {childMsg ? (
              <p
                className={`font-mono text-xs uppercase mb-4 px-3 py-2 border-2 border-black ${childMsgKind === 'error' ? 'bg-red-50 text-red-800' : 'bg-black/[0.03] text-black'}`}
                role="alert"
              >
                {childMsg}
              </p>
            ) : null}

            <div className="parent-led-scroll no-scrollbar max-h-[min(70vh,520px)] overflow-y-auto pr-1 mb-6">
              {childrenLoading ? (
                <p className="font-mono text-sm uppercase">LOADING_MANIFEST…</p>
              ) : children.length === 0 ? (
                <BrutalistCard className="bg-white">
                  <p className="m-0 font-mono text-sm uppercase tracking-wide">EMPTY_STATE — NO_OPERATIVES_DEPLOYED</p>
                </BrutalistCard>
              ) : (
                <div className="parent-roster-grid">
                  {children.map((child) => {
                    const age = getAgeYears(child.dateOfBirth);
                    const pinEligible = age != null && age <= 9;
                    const revealedPin = pinByChildId[child.id];
                    return (
                      <BrutalistCard key={child.id} className="bg-white flex flex-col">
                        <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-3 mb-3">
                          <div>
                            <p className="m-0 font-mono text-sm font-bold uppercase tracking-wide">{child.name}</p>
                            <p className="m-0 mt-1 font-mono text-[10px] text-black/60 uppercase">{child.email || 'NO_EMAIL'}</p>
                          </div>
                          <button
                            type="button"
                            className="parent-brutal-secondary-btn p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                            aria-label={`Remove ${child.name}`}
                            onClick={() => setRemoveChildTarget({ id: child.id, name: child.name })}
                          >
                            <IconTrash />
                          </button>
                        </div>
                        <LedgerRow k="RP_BAL" v={String(child.pointsBalance ?? 0)} />
                        <LedgerRow k="GP_BAL" v={String(child.giftcardPointsBalance ?? 0)} />
                        <div className="parent-led-row border-b-0">
                          <span className="parent-led-row-key">LOGIN_MODE</span>
                          <span className="parent-led-row-val font-mono text-[11px]">
                            {child.hasPasswordLogin ? 'PWD ' : ''}
                            {child.hasPasswordLogin && child.hasPinLogin ? '+' : ''}
                            {child.hasPinLogin ? 'PIN' : ''}
                            {!child.hasPasswordLogin && !child.hasPinLogin ? 'NONE' : ''}
                            {age != null ? ` · AGE_${age}` : ''}
                          </span>
                        </div>
                        {!pinEligible ? (
                          <p className="m-0 mt-2 font-mono text-[10px] uppercase text-black/55">PIN_LOCKED · AGE_10+</p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {pinEligible ? (
                            <button
                              type="button"
                              className="parent-brutal-secondary-btn inline-flex items-center gap-2"
                              onClick={() => handleGeneratePin(child.id)}
                              disabled={pinSavingId === child.id}
                            >
                              <IconKey />
                              {pinSavingId === child.id ? 'SAVING…' : 'ROTATE_PIN'}
                            </button>
                          ) : null}
                        </div>
                        {pinEligible && revealedPin ? (
                          <div className="mt-4">
                            <label className="parent-led-field-label" htmlFor={`pin-${child.id}`}>
                              EPHEMERAL_PIN_COPY
                            </label>
                            <BrutalistInput
                              id={`pin-${child.id}`}
                              readOnly
                              value={revealedPin}
                              onFocus={(e) => e.target.select()}
                              className="font-mono text-sm tracking-widest"
                            />
                          </div>
                        ) : null}
                      </BrutalistCard>
                    );
                  })}
                </div>
              )}
            </div>

            {showProvision ? (
              <ProvisionChildForm
                token={token}
                onCancel={() => setShowProvision(false)}
                onFinished={() => {
                  notifyChild('PROVISION_OK');
                  setShowProvision(false);
                  loadChildren();
                }}
              />
            ) : (
              <button type="button" className="parent-brutal-exec-btn max-w-md" onClick={() => setShowProvision(true)}>
                OPEN_PROVISION_SEQUENCE
              </button>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
