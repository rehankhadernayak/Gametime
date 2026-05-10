/**
 * Mission row: ASCII checkbox + title + reward (Child OS terminal chrome).
 */

export function MissionCard({
  title,
  rewardLabel,
  checked = false,
  onToggle,
  className = '',
  ...rest
}) {
  const mark = checked ? 'X' : ' ';
  const rowLabel = `[${mark}]`;

  return (
    <div
      className={`flex gap-grid-20 border-2 border-white bg-black p-grid-20 text-white ${className}`.trim()}
      {...rest}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onToggle}
        className="shrink-0 font-mono text-lg leading-none text-white underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {rowLabel}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold uppercase tracking-wide">{title}</p>
        <p className="mt-1 font-mono text-sm text-white/90">{rewardLabel}</p>
      </div>
    </div>
  );
}
