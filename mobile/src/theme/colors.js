// Gametime mobile color palette - Design System v2.0
// Brand: Electric Purple #7C5BFF | Child energy: Cyan #22D8E7

const colors = {
  // ── Brand - Parent (Premium Neon Indigo) ──────────────────────────
  primary:        '#7C5BFF',
  primaryDark:    '#110E26',
  primaryLight:   '#A28CFF',
  primarySurface: '#14162D',

  // ── Brand - Child (Cyan Energy) ─────────────────────────────────────
  energy:        '#22D8E7',
  energyDark:    '#00A6B9',
  energyLight:   '#6BD7FF',
  energySurface: '#0D2A37',

  // ── Child accent (Purple) ─────────────────────────────────────────
  child:        '#7C5BFF',
  childDark:    '#5C43E6',
  childLight:   '#A692FF',
  childSurface: '#1C1D33',

  // ── Semantic ──────────────────────────────────────────────────────
  success:        '#06D3A8',
  successSurface: 'rgba(6, 211, 168, 0.12)',
  warning:        '#FFA500',
  warningSurface: 'rgba(255, 165, 0, 0.12)',
  error:          '#FF3D5A',
  errorSurface:   'rgba(255, 61, 90, 0.12)',
  info:           '#22D8E7',
  infoSurface:    'rgba(34, 216, 231, 0.12)',

  // ── Backgrounds - Light mode ──────────────────────────────────────
  bgRoot:   '#0F1223',
  bgCard:   '#141A31',
  bgPanel:  '#191F39',
  bgInput:  '#141A2B',

  // ── Backgrounds - Dark mode ───────────────────────────────────────
  darkBgRoot:  '#05060D',
  darkBgCard:  '#0D1020',
  darkBgPanel: '#12162A',
  darkBgInput: '#171D34',

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary:   '#F6F8FF',
  textSecondary: '#AAB3D3',
  textMuted:     '#6F7CAA',
  textInverse:   '#FFFFFF',

  // ── Gamification ──────────────────────────────────────────────────
  gold:        '#FFB300',
  goldSurface: '#FFF8E1',
  silver:      '#78909C',
  bronze:      '#8D6E63',
  xpBar:       '#FFD700',
  streakFire:  '#FFA500',

  // ── Borders ───────────────────────────────────────────────────────
  border:       'rgba(124, 91, 255, 0.15)',
  borderStrong: 'rgba(124, 91, 255, 0.25)',

  // ── Gradients (use with LinearGradient) ───────────────────────────
  gradientParent:  ['#7C5BFF', '#22D8E7'],
  gradientChild:   ['#7C5BFF', '#22D8E7'],
  gradientSuccess: ['#06D3A8', '#22D8E7'],
  gradientGold:    ['#FF8F00', '#FFB300'],
  gradientDark:    ['#0A0A0F', '#141420'],

  // ── State colors for tasks ────────────────────────────────────────
  stateActive:          '#7C5BFF',
  stateActiveSurface:   'rgba(124, 91, 255, 0.12)',
  statePending:         '#FFA500',
  statePendingSurface:  'rgba(255, 165, 0, 0.12)',
  stateApproved:        '#06D3A8',
  stateApprovedSurface: 'rgba(6, 211, 168, 0.12)',
  stateRejected:        '#FF3D5A',
  stateRejectedSurface: 'rgba(255, 61, 90, 0.12)',
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
