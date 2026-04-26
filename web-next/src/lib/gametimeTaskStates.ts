/** Mirrors `backend/src/utils/constants.js` TASK_STATES for Realtime payload comparison. */
export const TASK_STATES = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PENDING_APPROVAL: "PendingApproval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
} as const;
