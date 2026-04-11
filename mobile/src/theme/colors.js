// Gametime mobile color palette — Design System v2.0
// Parent brand: Electric Indigo #3D5AFE | Child energy: Emerald #00C853

const colors = {
  // ── Brand - Parent (Electric Indigo) ──────────────────────────────
  primary:        '#3D5AFE',
  primaryDark:    '#1a1f71',
  primaryLight:   '#8C9EFF',
  primarySurface: '#E8EAFF',

  // ── Brand - Child (Emerald/Gaming) ────────────────────────────────
  energy:        '#00C853',
  energyDark:    '#009624',
  energyLight:   '#69F0AE',
  energySurface: '#E8F5E9',

  // ── Child accent (Purple) ─────────────────────────────────────────
  child:        '#7C3AED',
  childDark:    '#5B21B6',
  childLight:   '#A78BFA',
  childSurface: '#F5F3FF',

  // ── Semantic ──────────────────────────────────────────────────────
  success:        '#00C853',
  successSurface: '#E8F5E9',
  warning:        '#FF6D00',
  warningSurface: '#FFF3E0',
  error:          '#D32F2F',
  errorSurface:   '#FFEBEE',
  info:           '#3D5AFE',
  infoSurface:    '#E8EAFF',

  // ── Backgrounds - Light mode ──────────────────────────────────────
  bgRoot:   '#F8F9FF',
  bgCard:   '#FFFFFF',
  bgPanel:  '#F0F2FF',
  bgInput:  '#F5F6FF',

  // ── Backgrounds - Dark mode ───────────────────────────────────────
  darkBgRoot:  '#0A0A0F',
  darkBgCard:  '#141420',
  darkBgPanel: '#1C1C2E',
  darkBgInput: '#1E1E30',

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary:   '#0D0D1A',
  textSecondary: '#4A4A6A',
  textMuted:     '#8888AA',
  textInverse:   '#FFFFFF',

  // ── Gamification ──────────────────────────────────────────────────
  gold:        '#FFB300',
  goldSurface: '#FFF8E1',
  silver:      '#78909C',
  bronze:      '#8D6E63',
  xpBar:       '#3D5AFE',
  streakFire:  '#FF6D00',

  // ── Borders ───────────────────────────────────────────────────────
  border:       '#E0E0F0',
  borderStrong: '#C5C5E0',

  // ── Gradients (use with LinearGradient) ───────────────────────────
  gradientParent:  ['#1a1f71', '#3D5AFE'],
  gradientChild:   ['#5B21B6', '#7C3AED'],
  gradientSuccess: ['#00897B', '#00C853'],
  gradientGold:    ['#FF8F00', '#FFB300'],
  gradientDark:    ['#0A0A0F', '#141420'],

  // ── State colors for tasks ────────────────────────────────────────
  stateActive:          '#3D5AFE',
  stateActiveSurface:   '#E8EAFF',
  statePending:         '#FF6D00',
  statePendingSurface:  '#FFF3E0',
  stateApproved:        '#00C853',
  stateApprovedSurface: '#E8F5E9',
  stateRejected:        '#D32F2F',
  stateRejectedSurface: '#FFEBEE',
  stateExpired:         '#78909C',
  stateExpiredSurface:  '#ECEFF1',

  // ── Legacy aliases (kept for backward compatibility) ──────────────
  // Old primary was #3B5BDB — remapped to new primary
  // Old secondary (success green) → now 'success' but also kept as secondary
  secondary:    '#00C853',
  danger:       '#D32F2F',

  // Old child accent names
  childAccent:      '#7C3AED',
  childAccentDark:  '#5B21B6',
  childAccentLight: '#F5F3FF',

  // Old gamification
  xpGold:        '#FFB300',
  xpGoldSurface: '#FFF8E1',
  levelTeal:     '#14B8A6',

  // Old neutrals
  text:        '#0D0D1A',
  textSub:     '#4A4A6A',
  background:  '#F8F9FF',
  surface:     '#FFFFFF',
  surface2:    '#F0F2FF',
};

export { colors };
export default colors;

/**
 * Returns the foreground color for a given task/session state string.
 * @param {string} state
 * @returns {string}
 */
export function stateColor(state) {
  const v = String(state || '').toLowerCase();
  if (v === 'approved' || v === 'completed') return colors.stateApproved;
  if (v === 'pending' || v === 'pendingapproval') return colors.statePending;
  if (v === 'started' || v === 'active') return colors.stateActive;
  if (v === 'denied' || v === 'rejected') return colors.stateRejected;
  if (v === 'expired' || v === 'cancelled') return colors.stateExpired;
  return colors.primary;
}

/**
 * Returns the surface (background) color for a given task/session state string.
 * @param {string} state
 * @returns {string}
 */
export function stateSurface(state) {
  const v = String(state || '').toLowerCase();
  if (v === 'approved' || v === 'completed') return colors.stateApprovedSurface;
  if (v === 'pending' || v === 'pendingapproval') return colors.statePendingSurface;
  if (v === 'started' || v === 'active') return colors.stateActiveSurface;
  if (v === 'denied' || v === 'rejected') return colors.stateRejectedSurface;
  if (v === 'expired' || v === 'cancelled') return colors.stateExpiredSurface;
  return colors.primarySurface;
}
