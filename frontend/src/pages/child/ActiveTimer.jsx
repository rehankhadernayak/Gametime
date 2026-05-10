import { useCallback, useEffect, useState } from 'react';
import { useAppRouter } from 'gametime-web-nav';
import { apiRequest } from '../../api/client.js';
import { ArcadeButton, AsciiProgressBar } from '../../components/child-os/index.js';
import './ActiveTimer.css';

function calcRemaining(session) {
  if (!session || session.status === 'ended') return 0;
  const totalMinutes = session.grantedMinutes ?? session.durationMinutes ?? 0;
  const durationMs = totalMinutes * 60 * 1000;
  const started = new Date(session.startedAt).getTime();
  const elapsed = Date.now() - started;
  return Math.max(0, durationMs - elapsed);
}

function formatMmSs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function remainingPercent(session, remainingMs) {
  if (!session) return 0;
  const totalMinutes = session.grantedMinutes ?? session.durationMinutes ?? 0;
  const totalMs = totalMinutes * 60 * 1000;
  if (totalMs <= 0) return 0;
  return Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));
}

export default function ActiveTimer({ token }) {
  const router = useAppRouter();
  const [session, setSession] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const sessions = await apiRequest('/gaming/sessions', { token });
      const data = Array.isArray(sessions) ? sessions.find((s) => s.status === 'Started') || null : null;
      if (!data) {
        setSession(null);
        return;
      }
      setSession(data);
      setRemainingMs(calcRemaining(data));
    } catch {
      setSession(null);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadSession();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  useEffect(() => {
    if (!session) return undefined;
    const id = setInterval(() => {
      setRemainingMs(calcRemaining(session));
    }, 1000);
    return () => clearInterval(id);
  }, [session]);

  useEffect(() => {
    if (!session || remainingMs > 0) return;
    router.push('/child/dashboard');
  }, [remainingMs, session, router]);

  useEffect(() => {
    if (!session) return;
    const sync = setInterval(() => loadSession(), 10_000);
    return () => clearInterval(sync);
  }, [session, loadSession]);

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/child/dashboard');
    }
  }, [loading, session, router]);

  async function disconnect() {
    if (!session || disconnecting) return;
    const ok = window.confirm('Disconnect gaming link now? Remaining time may be forfeited.');
    if (!ok) return;
    setDisconnecting(true);
    try {
      const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
      const actualMinutes = Math.max(1, Math.round(elapsedMs / 60_000));
      await apiRequest('/gaming/sessions/end', {
        method: 'POST',
        token,
        body: { sessionId: session.id, actualMinutes }
      });
      router.push('/child/dashboard');
    } catch {
      setDisconnecting(false);
    }
  }

  if (loading || !session) {
    return (
      <div className="active-timer" role="status">
        <p className="active-timer__loading">LINK_STABILIZING...</p>
      </div>
    );
  }

  const pct = remainingPercent(session, remainingMs);

  return (
    <div className="active-timer">
      <div className="active-timer__center">
        <p className="active-timer__meta">
          {session.gameName} · {session.platform}
        </p>
        <p className="active-timer__clock" role="timer" aria-live="off">
          {formatMmSs(remainingMs)}
        </p>
        <div className="active-timer__progress-wrap">
          <AsciiProgressBar remainingPercent={pct} label="Gaming session time remaining" />
        </div>
      </div>

      <footer className="active-timer__footer">
        <p className="active-timer__status">SYSTEM_ACTIVE</p>
        <ArcadeButton type="button" block variant="danger" disabled={disconnecting} onClick={disconnect}>
          DISCONNECT
        </ArcadeButton>
      </footer>
    </div>
  );
}
