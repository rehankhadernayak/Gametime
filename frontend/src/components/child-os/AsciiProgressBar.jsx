import './AsciiProgressBar.css';

const SEGMENTS = 28;

export function AsciiProgressBar({ remainingPercent, label = 'Session time remaining' }) {
  const pct = Math.min(100, Math.max(0, remainingPercent));
  const filled = Math.round((pct / 100) * SEGMENTS);
  const empty = SEGMENTS - filled;
  const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;

  return (
    <pre className="ascii-progress-bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      {bar}
    </pre>
  );
}
