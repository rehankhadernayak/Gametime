import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../api/client.js';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false">
      <path
        d="M12 3a6 6 0 0 0-6 6v3.4c0 .7-.28 1.37-.78 1.86L3.5 16h17l-1.72-1.74a2.64 2.64 0 0 1-.78-1.86V9a6 6 0 0 0-6-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 18a2.5 2.5 0 0 0 5 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function NotificationBell({ token, role }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const rootRef = useRef(null);
  /** Cookie sessions use placeholder `cookie` in the nav — omit Authorization so httpOnly JWT is used. */
  const bearerToken = token && token !== 'cookie' ? token : undefined;

  async function loadNotifications() {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const list = await apiRequest('/notifications/list', { token: bearerToken });
      setNotifications(list);
    } catch (e) {
      setError(e.message || 'Failed to load notifications');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    loadNotifications();
    const timer = setInterval(loadNotifications, 25000);
    return () => clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.read).map((item) => item.id),
    [notifications]
  );

  async function markAllRead() {
    if (!unreadIds.length) return;
    try {
      await apiRequest('/notifications/markRead', {
        method: 'POST',
        token: bearerToken,
        body: { notificationIds: unreadIds }
      });
      await loadNotifications();
    } catch (e) {
      setError(e.message || 'Failed to update notifications');
    }
  }

  return (
    <div className="notification-wrap" ref={rootRef}>
      <button
        type="button"
        className="icon-button notification-trigger"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next) await loadNotifications();
        }}
      >
        <BellIcon />
        {unreadIds.length > 0 ? <span className="notification-badge">{Math.min(unreadIds.length, 99)}</span> : null}
      </button>

      {open ? (
        <div className="notification-popover" role="dialog" aria-label="Notifications list">
          <div className="notification-popover-header">
            <strong>{role === 'parent' ? 'Parent Notifications' : 'Child Notifications'}</strong>
            <div className="notification-popover-actions">
              <button type="button" onClick={markAllRead} disabled={!unreadIds.length}>Mark all read</button>
              <button type="button" className="ghost-button" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
          {busy ? <p className="notification-empty">Loading notifications...</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {!busy && notifications.length === 0 ? <p className="notification-empty">No notifications yet.</p> : null}
          <ul className="notification-list">
            {notifications.slice(0, 20).map((item) => (
              <li key={item.id} className={item.read ? 'read' : 'unread'}>
                <p>{item.message}</p>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
