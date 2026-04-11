function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.5" cy="8.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M13 19c0-2.1 1.6-3.8 3.7-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12.5 9.2 17 19 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RequestIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6h16v10H7l-3 3V6Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 8h18v4H3zM5 12h14v9H5zM12 8v13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8s-3.5-1.2-3.5-3A2 2 0 0 1 12 4m0 4s3.5-1.2 3.5-3A2 2 0 0 0 12 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <ellipse cx="12" cy="7" rx="6.5" ry="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 7v8c0 2 3 3.5 6.5 3.5s6.5-1.5 6.5-3.5V7" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3a6 6 0 0 0-6 6v3.4c0 .7-.28 1.37-.78 1.86L3.5 16h17l-1.72-1.74a2.64 2.64 0 0 1-.78-1.86V9a6 6 0 0 0-6-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 16.5 16.5 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 6h13M7 12h13M7 18h13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function GamepadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="9" width="18" height="9" rx="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 13h4M10 11v4M15.5 12.5h.01M17.5 14.5h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = {
  children: UsersIcon,
  approvals: CheckIcon,
  requests: RequestIcon,
  rewards: GiftIcon,
  gp: CoinIcon,
  unread: BellIcon,
  blocked: BlockIcon,
  rp: CoinIcon,
  tasks: TaskIcon,
  play: GamepadIcon
};

export default function MetricIcon({ name }) {
  const Icon = ICONS[name] || TaskIcon;
  return <Icon />;
}
