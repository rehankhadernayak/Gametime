import { useEffect, useRef, useState } from 'react';
import { useAppRouter, useAppSearchParams } from 'gametime-web-nav';
import { API_BASE, apiRequest } from '../api/client.js';
import ChildCreation from './ChildCreation.jsx';
import ParentTheme from '../components/ParentTheme.jsx';
import GTCard from '../components/GTCard.jsx';
import GTInput from '../components/GTInput.jsx';

/* ── Icons ──────────────────────────────────────────────────────────── */
function IconChildren() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3"/><path d="M4 20c0-3.3 2.7-6 5-6"/><circle cx="17" cy="8" r="2.5"/><path d="M13 20c0-2.5 1.8-4.5 4-5"/></svg>;
}
function IconPaint() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a9 9 0 0 1 9 9c0 3-2 5-4 5a2 2 0 0 0 0 4 1 1 0 0 1 0 2 9 9 0 1 1-5-16.3"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="9" r="1" fill="currentColor"/><circle cx="6.5" cy="10" r="1" fill="currentColor"/></svg>;
}
function IconBell() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
}
function IconShield() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function IconSliders() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
}
function IconBack() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
}
function IconTrash() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
}

function IconKey() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
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

/* ── Toggle sub-component ───────────────────────────────────────────── */
function SettingsToggle({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className={`settings-toggle-row${disabled ? ' disabled' : ''}`}>
      <div className="settings-toggle-text">
        <div className="settings-toggle-label">{label}</div>
        {description && <div className="settings-toggle-desc">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`settings-toggle${checked ? ' on' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </div>
  );
}

/* ── Category config ────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'children',    label: 'Child Management', Icon: IconChildren },
  { id: 'appearance',  label: 'Appearance',        Icon: IconPaint },
  { id: 'notifications', label: 'Notifications',   Icon: IconBell },
  { id: 'security',    label: 'Account & Security', Icon: IconShield },
  { id: 'preferences', label: 'Preferences',        Icon: IconSliders }
];

const LEARNING_INTERESTS = [
  'Mathematics', 'Science', 'Reading', 'Art',
  'Sports', 'Music', 'Coding', 'History',
  'Languages', 'Cooking'
];

/* ── Main component ─────────────────────────────────────────────────── */
export default function SettingsPage({ token, theme, onToggleTheme, parentName }) {
  const router = useAppRouter();
  const searchParams = useAppSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'children');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* ── Child management ── */
  const [children,       setChildren]       = useState([]);
  const [childrenLoading,setChildrenLoading]= useState(false);
  const [showAddChild,   setShowAddChild]   = useState(false);
  const [childMsg,       setChildMsg]       = useState('');
  const [childMsgKind,   setChildMsgKind]   = useState('success');
  const [pinByChildId,   setPinByChildId]   = useState({});
  const [pinSavingId,    setPinSavingId]    = useState('');

  /* ── Appearance ── */
  const [fontSize, setFontSize] = useState('medium');
  const [language, setLanguage] = useState('English');

  /* ── Notifications ── */
  const [notif, setNotif] = useState({ enabled: true, taskApprovals: true, childActivity: true, weeklyReport: true, reminderSchedule: 'daily' });
  const [notifSaveStatus, setNotifSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'
  const notifInitialised = useRef(false);
  const notifSaveTimer = useRef(null);

  /* ── Security ── */
  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [pwdMsg,  setPwdMsg]  = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  /* ── Preferences ── */
  const [prefs, setPrefs] = useState({
    contentFilter: 'moderate',
    ageContent: true,
    learningInterests: []
  });

  /* ── Hydrate local preferences from storage (client-only) ── */
  useEffect(() => {
    try {
      const fs = localStorage.getItem('gametime_font_size');
      if (fs === 'small' || fs === 'medium' || fs === 'large') setFontSize(fs);
      const lang = localStorage.getItem('gametime_language');
      if (lang) setLanguage(lang);
      const rawPrefs = localStorage.getItem('gametime_preferences');
      if (rawPrefs) {
        const parsed = JSON.parse(rawPrefs);
        if (parsed && typeof parsed === 'object') setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  /* ── Load children on mount ── */
  useEffect(() => { loadChildren(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Persist font size to CSS var + localStorage ── */
  useEffect(() => {
    const scale = fontSize === 'small' ? '0.88' : fontSize === 'large' ? '1.12' : '1';
    document.documentElement.style.setProperty('--font-scale', scale);
    localStorage.setItem('gametime_font_size', fontSize);
  }, [fontSize]);

  /* ── Load notification prefs from server on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest('/notifications/preferences', { token });
        setNotif(data);
      } catch {
        // Fall back to defaults already in state - server may not have prefs yet
      } finally {
        notifInitialised.current = true;
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-save notification prefs to server (debounced 600 ms) ── */
  useEffect(() => {
    if (!notifInitialised.current) return; // Skip the first render before load completes
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

  /* ── Persist preferences ── */
  useEffect(() => { localStorage.setItem('gametime_preferences', JSON.stringify(prefs)); }, [prefs]);

  async function loadChildren() {
    setChildrenLoading(true);
    try {
      const data = await apiRequest('/children/list', { token });
      setChildren(Array.isArray(data) ? data : []);
    } catch { setChildren([]); }
    finally { setChildrenLoading(false); }
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

  async function handleDeleteChild(childId, childName) {
    if (!window.confirm(`Remove ${childName} from your Gametime account? This cannot be undone.`)) return;
    try {
      await apiRequest(`/children/${childId}`, { method: 'DELETE', token });
      notifyChild(`${childName} removed.`);
      await loadChildren();
    } catch (err) {
      notifyChild(err.message || 'Could not remove child.', 'error');
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
      // Hard reload to clear all state
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
    if (newPwd.length < 8) { setPwdMsg('New password must be at least 8 characters.'); return; }
    if (newPwd !== confPwd) { setPwdMsg('New passwords do not match.'); return; }
    setPwdBusy(true);
    setPwdMsg('');
    try {
      await apiRequest('/auth/change-password', { method: 'POST', token, body: { currentPassword: curPwd, newPassword: newPwd } });
      setPwdMsg('Password changed successfully.');
      setCurPwd(''); setNewPwd(''); setConfPwd('');
    } catch (err) {
      setPwdMsg(err.message || 'Could not change password.');
    } finally {
      setPwdBusy(false);
    }
  }

  function toggleInterest(interest) {
    setPrefs((p) => ({
      ...p,
      learningInterests: p.learningInterests.includes(interest)
        ? p.learningInterests.filter((i) => i !== interest)
        : [...p.learningInterests, interest]
    }));
  }

  /* ── Content renderers ── */
  function renderChildren() {
    return (
      <div className="settings-section">
        <div className="settings-section-head">
          <h2>Child Management</h2>
          <p className="settings-section-sub">Family roster: add children, rotate PINs for younger profiles, or remove accounts.</p>
        </div>

        {childMsg && (
          <p className={childMsgKind === 'error' ? 'error' : 'notice'} role="alert">{childMsg}</p>
        )}

        <ParentTheme>
          {childrenLoading ? (
            <p className="settings-loading">Loading children...</p>
          ) : children.length === 0 ? (
            <GTCard title="Family roster" subtitle="No heroes yet — add your first child to unlock tasks and rewards.">
              <p className="settings-roster-empty">When you add a child, they appear here with balances and login options.</p>
            </GTCard>
          ) : (
            <div className="settings-roster-grid">
              {children.map((child) => {
                const age = getAgeYears(child.dateOfBirth);
                const pinEligible = age != null && age <= 9;
                const revealedPin = pinByChildId[child.id];
                return (
                  <GTCard
                    key={child.id}
                    className="settings-roster-card"
                    title={child.name}
                    subtitle={child.email || 'No email on file'}
                    footer={(
                      <div className="settings-roster-footer">
                        <span className="settings-roster-balances">
                          <strong>{child.pointsBalance ?? 0}</strong> RP · <strong>{child.giftcardPointsBalance ?? 0}</strong> GP
                        </span>
                        <div className="settings-roster-actions">
                          {pinEligible ? (
                            <button
                              type="button"
                              className="settings-roster-pill-btn"
                              onClick={() => handleGeneratePin(child.id)}
                              disabled={pinSavingId === child.id}
                            >
                              <IconKey />
                              {pinSavingId === child.id ? 'Saving…' : 'New PIN'}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="settings-delete-btn settings-roster-remove"
                            aria-label={`Remove ${child.name}`}
                            onClick={() => handleDeleteChild(child.id, child.name)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    )}
                  >
                    <div className="settings-roster-body">
                      <div className="settings-child-avatar settings-roster-avatar" aria-hidden="true">
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="settings-roster-login-line">
                        {child.hasPasswordLogin ? 'Password login' : ''}
                        {child.hasPasswordLogin && child.hasPinLogin ? ' · ' : ''}
                        {child.hasPinLogin ? 'PIN login' : ''}
                        {!child.hasPasswordLogin && !child.hasPinLogin ? 'No child login yet' : ''}
                        {age != null ? ` · Age ${age}` : ''}
                      </p>
                      {!pinEligible && (
                        <p className="gt-input-hint">Children 10+ use email and password; PIN is not available.</p>
                      )}
                      {pinEligible && revealedPin && (
                        <GTInput
                          readOnly
                          label="New child PIN (copy now)"
                          hint="This PIN is shown once after generation. Store it securely for your child."
                          value={revealedPin}
                          onFocus={(e) => e.target.select()}
                        />
                      )}
                    </div>
                  </GTCard>
                );
              })}
            </div>
          )}

          {showAddChild ? (
            <GTCard
              title="Add to roster"
              subtitle="Create a child profile with date of birth and login method."
              footer={(
                <button type="button" className="secondary-button" onClick={() => setShowAddChild(false)}>
                  Cancel
                </button>
              )}
            >
              <ChildCreation
                token={token}
                onCreate={async (form) => {
                  try {
                    await apiRequest('/children/create', { method: 'POST', token, body: form });
                    notifyChild(`Child account created: ${form.name}`);
                    setShowAddChild(false);
                    await loadChildren();
                  } catch (err) {
                    notifyChild(err.message, 'error');
                    throw err;
                  }
                }}
              />
            </GTCard>
          ) : (
            <button type="button" className="settings-action-btn" onClick={() => setShowAddChild(true)}>
              + Add Child
            </button>
          )}
        </ParentTheme>
      </div>
    );
  }

  function renderAppearance() {
    return (
      <div className="settings-section">
        <div className="settings-section-head">
          <h2>Appearance</h2>
          <p className="settings-section-sub">Customise how Gametime looks for you.</p>
        </div>

        <div className="settings-option-group">
          <h3 className="settings-option-title">Theme</h3>
          <div className="settings-theme-row">
            <button
              type="button"
              className={`settings-theme-card${theme === 'light' ? ' active' : ''}`}
              onClick={() => { if (theme === 'dark') onToggleTheme(); }}
            >
              <span className="settings-theme-preview light-preview" aria-hidden="true" />
              <span>Light</span>
              {theme === 'light' && <span className="settings-active-badge">Active</span>}
            </button>
            <button
              type="button"
              className={`settings-theme-card${theme === 'dark' ? ' active' : ''}`}
              onClick={() => { if (theme === 'light') onToggleTheme(); }}
            >
              <span className="settings-theme-preview dark-preview" aria-hidden="true" />
              <span>Dark</span>
              {theme === 'dark' && <span className="settings-active-badge">Active</span>}
            </button>
          </div>
        </div>

        <div className="settings-option-group">
          <h3 className="settings-option-title">Font Size</h3>
          <div className="settings-choice-row">
            {['small', 'medium', 'large'].map((size) => (
              <button key={size} type="button"
                className={`settings-choice-btn${fontSize === size ? ' active' : ''}`}
                onClick={() => setFontSize(size)}
              >
                <span className={`font-size-preview font-${size}`}>Aa</span>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-option-group">
          <h3 className="settings-option-title">
            Language
            <span className="settings-badge coming-soon" style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}>Coming Soon</span>
          </h3>
          <select className="settings-select" value="English" disabled aria-disabled="true">
            <option value="English">English</option>
          </select>
          <p className="settings-note">Multi-language support is coming in a future update. English only for now.</p>
        </div>
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div className="settings-section">
        <div className="settings-section-head">
          <h2>Notifications</h2>
          <p className="settings-section-sub">Choose what alerts you receive and when.</p>
        </div>

        <div className="settings-toggle-group">
          <SettingsToggle label="Enable Notifications" description="Receive updates about your family's activity"
            checked={notif.enabled} onChange={(v) => setNotif((p) => ({ ...p, enabled: v }))} />
          <SettingsToggle label="Task Approval Requests" description="Notify when a child submits a completed task"
            checked={notif.taskApprovals} onChange={(v) => setNotif((p) => ({ ...p, taskApprovals: v }))} disabled={!notif.enabled} />
          <SettingsToggle label="Child Activity Alerts" description="Notify when children earn points or redeem rewards"
            checked={notif.childActivity} onChange={(v) => setNotif((p) => ({ ...p, childActivity: v }))} disabled={!notif.enabled} />
          <SettingsToggle label="Weekly Family Reports" description="Receive a weekly summary of your family's progress"
            checked={notif.weeklyReport} onChange={(v) => setNotif((p) => ({ ...p, weeklyReport: v }))} disabled={!notif.enabled} />
        </div>

        <div className="settings-option-group">
          <h3 className="settings-option-title">Reminder Schedule</h3>
          <div className="settings-choice-row">
            {['off', 'daily', 'weekly'].map((s) => (
              <button key={s} type="button"
                className={`settings-choice-btn${notif.reminderSchedule === s ? ' active' : ''}`}
                onClick={() => setNotif((p) => ({ ...p, reminderSchedule: s }))} disabled={!notif.enabled}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <p className="settings-save-note">
          {notifSaveStatus === 'saving' && 'Saving…'}
          {notifSaveStatus === 'saved'  && '✓ Saved'}
          {notifSaveStatus === 'error'  && 'Could not save preferences'}
          {!notifSaveStatus             && 'Preferences sync automatically.'}
        </p>
      </div>
    );
  }

  function renderSecurity() {
    return (
      <div className="settings-section">
        <div className="settings-section-head">
          <h2>Account and Security</h2>
          <p className="settings-section-sub">Manage your password and account security.</p>
        </div>

        {/* Change Password */}
        <div className="settings-panel">
          <h3>Change Password</h3>
          <form onSubmit={handleChangePassword} className="settings-form">
            <label className="settings-form-label">
              Current password
              <input type="password" className="settings-input" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} required autoComplete="current-password" />
            </label>
            <label className="settings-form-label">
              New password
              <input type="password" className="settings-input" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required minLength={8} autoComplete="new-password" />
            </label>
            <label className="settings-form-label">
              Confirm new password
              <input type="password" className="settings-input" value={confPwd} onChange={(e) => setConfPwd(e.target.value)} required autoComplete="new-password" />
            </label>
            {pwdMsg && (
              <p className={pwdMsg.includes('successfully') ? 'notice' : 'error'} role="alert">{pwdMsg}</p>
            )}
            <button type="submit" className="settings-action-btn" disabled={pwdBusy}>
              {pwdBusy ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Two-Factor Auth stub */}
        <div className="settings-panel settings-panel-row">
          <div>
            <h3>Two-Factor Authentication</h3>
            <p className="settings-panel-desc">Add an extra layer of security to your account.</p>
          </div>
          <span className="settings-badge coming-soon">Coming soon</span>
        </div>

        {/* Login Activity */}
        <div className="settings-panel">
          <h3>Login Activity</h3>
          <p className="settings-panel-desc">Recent sign-ins to your account.</p>
          <div className="settings-activity-item">
            <div>
              <strong>This device</strong>
              <span className="settings-activity-time">Now</span>
            </div>
            <span className="settings-badge active-badge">Active</span>
          </div>
        </div>

        {/* Device Management stub */}
        <div className="settings-panel settings-panel-row">
          <div>
            <h3>Device Management</h3>
            <p className="settings-panel-desc">Manage devices signed in to your account.</p>
          </div>
          <span className="settings-badge coming-soon">Coming soon</span>
        </div>

        {/* PDPA Data Export */}
        <div className="settings-panel">
          <h3>Download My Data</h3>
          <p className="settings-panel-desc">
            Export a copy of all your personal data stored in Gametime, including children profiles,
            tasks, rewards, and points history. Your data will be downloaded as a JSON file.
          </p>
          <button
            type="button"
            className="settings-action-btn"
            onClick={handleExportData}
            disabled={exportBusy}
          >
            {exportBusy ? 'Preparing export…' : 'Download My Data'}
          </button>
        </div>

        {/* Danger Zone - Delete Account */}
        <div className="settings-panel settings-danger-zone">
          <h3>Delete Account</h3>
          <p className="settings-panel-desc">
            Permanently delete your Gametime account and all associated data - children, tasks, rewards, and
            points. <strong>This cannot be undone.</strong>
          </p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              className="settings-danger-btn"
              onClick={() => { setShowDeleteConfirm(true); setDeleteMsg(''); setDeletePassword(''); }}
            >
              Delete My Account
            </button>
          ) : (
            <form onSubmit={handleDeleteAccount} className="settings-form">
              <p className="settings-danger-warning">
                Enter your password to confirm. All family data will be permanently erased.
              </p>
              <label className="settings-form-label">
                Your password
                <input
                  type="password"
                  className="settings-input"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  autoFocus
                />
              </label>
              {deleteMsg && <p className="error" role="alert">{deleteMsg}</p>}
              <div className="settings-danger-actions">
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteMsg(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="settings-danger-btn" disabled={deleteBusy}>
                  {deleteBusy ? 'Deleting…' : 'Permanently Delete Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  function renderPreferences() {
    return (
      <div className="settings-section">
        <div className="settings-section-head">
          <h2>Preferences</h2>
          <p className="settings-section-sub">Customise content and quest suggestions for your family.</p>
        </div>

        <div className="settings-option-group">
          <h3 className="settings-option-title">Content Filtering</h3>
          <p className="settings-note">Sets the strictness of game and quest content filters.</p>
          <div className="settings-choice-row">
            {[
              { id: 'strict',   label: 'Strict',   desc: 'Maximum protection' },
              { id: 'moderate', label: 'Moderate',  desc: 'Balanced (default)' },
              { id: 'relaxed',  label: 'Relaxed',   desc: 'Minimal filtering' }
            ].map(({ id, label, desc }) => (
              <button key={id} type="button"
                className={`settings-choice-btn vertical${prefs.contentFilter === id ? ' active' : ''}`}
                onClick={() => setPrefs((p) => ({ ...p, contentFilter: id }))}>
                <span className="settings-choice-label">{label}</span>
                <span className="settings-choice-desc">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-toggle-group">
          <SettingsToggle
            label="Age-Based Content Customisation"
            description="Show quests and content tailored to each child's age group"
            checked={prefs.ageContent}
            onChange={(v) => setPrefs((p) => ({ ...p, ageContent: v }))}
          />
        </div>

        <div className="settings-option-group">
          <h3 className="settings-option-title">Learning Interests</h3>
          <p className="settings-note">Selected topics are used to tailor quest suggestions.</p>
          <div className="settings-interest-grid">
            {LEARNING_INTERESTS.map((interest) => (
              <button key={interest} type="button"
                className={`settings-interest-chip${prefs.learningInterests.includes(interest) ? ' active' : ''}`}
                onClick={() => toggleInterest(interest)}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        <p className="settings-save-note">Preferences are saved automatically.</p>
      </div>
    );
  }

  const activeCategory = CATEGORIES.find((c) => c.id === activeTab);

  function renderContent() {
    switch (activeTab) {
      case 'children':      return renderChildren();
      case 'appearance':    return renderAppearance();
      case 'notifications': return renderNotifications();
      case 'security':      return renderSecurity();
      case 'preferences':   return renderPreferences();
      default:              return null;
    }
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <header className="settings-header">
        <button type="button" className="settings-back-btn" onClick={() => router.back()} aria-label="Go back">
          <IconBack />
          <span>Back</span>
        </button>
        <h1 className="settings-title">Settings</h1>
        {parentName && <span className="settings-user-name">{parentName.split(' ')[0]}</span>}
      </header>

      <div className="settings-layout">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button key={id} type="button"
              className={`settings-nav-btn${activeTab === id ? ' active' : ''}`}
              onClick={() => { setActiveTab(id); setMobileNavOpen(false); }}>
              <span className="settings-nav-icon"><Icon /></span>
              <span className="settings-nav-label">{label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="settings-main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
