const FULL = '\u2588';
const EMPTY = '\u2591';

function clampPct(n) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * @param {object} props
 * @param {number} props.percentage — 0–100
 * @param {number} [props.segments=10] — width of the bar in monospace columns
 * @param {string} [props.className]
 */
export function AsciiProgressBar({ percentage, segments = 10, className = '', ...rest }) {
  const pct = clampPct(Number(percentage));
  const filled = Math.round((pct / 100) * segments);
  const safeFilled = Math.min(segments, Math.max(0, filled));
  const bar = FULL.repeat(safeFilled) + EMPTY.repeat(segments - safeFilled);
  const rounded = Math.round(pct);

  return (
    <span
      className={`inline-block whitespace-pre font-mono text-sm tabular-nums text-white ${className}`.trim()}
      {...rest}
    >
      [{bar}] {rounded}%
    </span>
  );
}
