import './MissionCard.css';

function formatMissionState(state) {
  if (!state) return 'UNKNOWN';
  return String(state)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim()
    .toUpperCase();
}

function fmtDue(value) {
  if (!value) return 'NO DEADLINE';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'NO DEADLINE';
  return `DUE ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export function MissionCard({ task, selected, onSelect }) {
  const { title, state, points, gpPoints, dueDate } = task;

  return (
    <button
      type="button"
      className={`mission-card${selected ? ' mission-card--selected' : ''}`}
      onClick={() => onSelect?.(task)}
    >
      <div className="mission-card__top">
        <h3 className="mission-card__title">{title}</h3>
        <span className="mission-card__state">{formatMissionState(state)}</span>
      </div>
      <p className="mission-card__meta">
        {points ?? 0} RP
        {gpPoints ? ` · ${gpPoints} GP` : ''}
        {' · '}
        {fmtDue(dueDate)}
      </p>
    </button>
  );
}
