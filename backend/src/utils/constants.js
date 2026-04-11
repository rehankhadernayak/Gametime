// ── Task & Request States ────────────────────────────────────────────────────
export const TASK_STATES = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PENDING_APPROVAL: 'PendingApproval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled'
};

export const TASK_REQUEST_STATES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
};

export const COMPLETION_STATES = {
  PENDING_APPROVAL: 'PendingApproval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

// ── Points & Currency ────────────────────────────────────────────────────────
export const POINTS_KINDS = {
  RP: 'RP',
  GP: 'GP'
};

export const TRANSACTION_TYPES = {
  CREDIT: 'Credit',
  DEBIT: 'Debit'
};

export const REFERENCE_TYPES = {
  TASK: 'Task',
  REWARD: 'Reward',
  MANUAL_ADJUSTMENT: 'ManualAdjustment',
  REFUND: 'Refund',
  GAMING_SESSION: 'GamingSession',
  PURCHASE: 'Purchase',
  TASK_ALLOCATION: 'TaskAllocation',
  TASK_REFUND: 'TaskRefund',
  GIFTCARD_REDEMPTION: 'GiftcardRedemption'
};

// ── Notifications ────────────────────────────────────────────────────────────
export const RECIPIENT_TYPES = {
  PARENT: 'Parent',
  CHILD: 'Child'
};

// ── Gaming ───────────────────────────────────────────────────────────────────
export const GAME_STATUSES = {
  BLOCKED: 'Blocked',
  ALLOWED: 'Allowed'
};

export const SESSION_STATUSES = {
  STARTED: 'Started',
  COMPLETED: 'Completed',
  DENIED: 'Denied'
};

export const SESSION_SOURCES = {
  IN_APP: 'InApp',
  IMPORT: 'Import'
};

export const DENIAL_CODES = {
  BLOCKED_GAME: 'BLOCKED_GAME',
  ACTIVE_SESSION_EXISTS: 'ACTIVE_SESSION_EXISTS',
  DAILY_CAP_REACHED: 'DAILY_CAP_REACHED',
  WEEKLY_CAP_REACHED: 'WEEKLY_CAP_REACHED',
  NO_MINUTES_FROM_POINTS: 'NO_MINUTES_FROM_POINTS'
};

export const GAMING_PLATFORMS = ['iOS', 'Windows', 'macOS', 'Web', 'Console', 'Other'];

// ── Redemptions ───────────────────────────────────────────────────────────────
export const REDEMPTION_STATUSES = {
  PENDING: 'Pending',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled'
};

// ── Giftcards ─────────────────────────────────────────────────────────────────
export const GIFTCARD_CODE_STATUSES = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  EXPIRED: 'Expired'
};

export const GIFTCARD_BATCH_STATUSES = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

export const GP_BALANCE_TYPES = {
  PARENT_POOL: 'ParentPool',
  CHILD_WALLET: 'ChildWallet'
};

// ── Evidence ──────────────────────────────────────────────────────────────────
export const EVIDENCE_TYPES = {
  PHOTO: 'Photo',
  VIDEO: 'Video'
};

// ── Auth ──────────────────────────────────────────────────────────────────────
/** Maximum age (in years) for PIN-based child login */
export const PIN_LOGIN_MAX_AGE_YEARS = 9;

// ── Business Limits ───────────────────────────────────────────────────────────
export const TASK_DUE_DATE_MAX_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
export const TASK_REQUEST_DEFAULT_DUE_MS = 48 * 60 * 60 * 1000; // 48 hours
