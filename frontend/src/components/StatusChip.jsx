const MAP = {
  Active: { label: 'Active', className: 'status-active' },
  Pending: { label: 'Pending', className: 'status-pending' },
  PendingApproval: { label: 'Pending', className: 'status-pending' },
  Approved: { label: 'Approved', className: 'status-approved' },
  Rejected: { label: 'Rejected', className: 'status-rejected' },
  Expired: { label: 'Expired', className: 'status-expired' },
  Cancelled: { label: 'Cancelled', className: 'status-cancelled' },
  Draft: { label: 'Draft', className: 'status-draft' },
  Blocked: { label: 'Blocked', className: 'status-blocked' },
  Allowed: { label: 'Allowed', className: 'status-allowed' },
  Started: { label: 'Started', className: 'status-active' },
  Completed: { label: 'Completed', className: 'status-approved' },
  Denied: { label: 'Denied', className: 'status-rejected' }
};

export default function StatusChip({ state }) {
  const meta = MAP[state] || { label: state || 'Unknown', className: 'status-default' };
  return (
    <span className={`status-chip ${meta.className}`} aria-label={`Task status ${state}`}>
      <span className="status-dot" aria-hidden="true" />
      <span className="status-text">{meta.label}</span>
    </span>
  );
}
