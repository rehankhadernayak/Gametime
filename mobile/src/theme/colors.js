/**
 * Gametime mobile palette — brutalist 1-bit mono (IBM Plex via App.js)
 * Replaces electric purple / cyan brand system.
 */

const colors = {
  primary: '#000000',
  primaryDark: '#000000',
  primaryLight: '#525252',
  primarySurface: 'rgba(0, 0, 0, 0.06)',

  energy: '#000000',
  energyDark: '#000000',
  energyLight: '#525252',
  energySurface: 'rgba(0, 0, 0, 0.06)',

  child: '#000000',
  childDark: '#000000',
  childLight: '#525252',
  childSurface: 'rgba(0, 0, 0, 0.06)',

  success: '#15803d',
  successSurface: 'rgba(21, 128, 61, 0.12)',
  warning: '#a16207',
  warningSurface: 'rgba(161, 98, 7, 0.12)',
  error: '#b91c1c',
  errorSurface: 'rgba(185, 28, 28, 0.12)',
  info: '#000000',
  infoSurface: 'rgba(0, 0, 0, 0.06)',

  bgRoot: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgPanel: '#FFFFFF',
  bgInput: '#FFFFFF',

  textPrimary: '#000000',
  textSecondary: '#404040',
  textMuted: '#737373',
  textInverse: '#FFFFFF',

  gold: '#000000',
  goldSurface: 'rgba(0, 0, 0, 0.06)',
  silver: '#737373',
  bronze: '#525252',
  xpBar: '#000000',
  streakFire: '#000000',

  border: '#000000',
  borderStrong: '#000000',

  gradientParent: ['#FFFFFF', '#FFFFFF'],
  gradientChild: ['#FFFFFF', '#FFFFFF'],
  gradientSuccess: ['#FFFFFF', '#F5F5F5'],
  gradientGold: ['#FFFFFF', '#F5F5F5'],
  gradientDark: ['#FFFFFF', '#F5F5F5'],
  /** Solid hero fills — flat headers use plain Views */
  gradientHero: ['#FFFFFF', '#FFFFFF'],

  stateActive: '#000000',
  stateActiveSurface: 'rgba(0, 0, 0, 0.06)',
  statePending: '#a16207',
  statePendingSurface: 'rgba(161, 98, 7, 0.12)',
  stateApproved: '#15803d',
  stateApprovedSurface: 'rgba(21, 128, 61, 0.12)',
  stateRejected: '#b91c1c',
  stateRejectedSurface: 'rgba(185, 28, 28, 0.12)',
  stateExpired: '#737373',
  stateExpiredSurface: 'rgba(115, 115, 115, 0.12)',

  secondary: '#15803d',
  danger: '#b91c1c',

  childAccent: '#000000',
  childAccentDark: '#000000',
  childAccentLight: '#F5F5F5',

  xpGold: '#000000',
  xpGoldSurface: 'rgba(0, 0, 0, 0.06)',
  levelTeal: '#000000',

  text: '#000000',
  textSub: '#525252',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#F5F5F5',
};

export { colors };
export default colors;

export function stateColor(state) {
  const v = String(state || '').toLowerCase();
  if (v === 'approved' || v === 'completed') return colors.stateApproved;
  if (v === 'pending' || v === 'pendingapproval') return colors.statePending;
  if (v === 'started' || v === 'active') return colors.stateActive;
  if (v === 'denied' || v === 'rejected') return colors.stateRejected;
  if (v === 'expired' || v === 'cancelled') return colors.stateExpired;
  return colors.primary;
}

export function stateSurface(state) {
  const v = String(state || '').toLowerCase();
  if (v === 'approved' || v === 'completed') return colors.stateApprovedSurface;
  if (v === 'pending' || v === 'pendingapproval') return colors.statePendingSurface;
  if (v === 'started' || v === 'active') return colors.stateActiveSurface;
  if (v === 'denied' || v === 'rejected') return colors.stateRejectedSurface;
  if (v === 'expired' || v === 'cancelled') return colors.stateExpiredSurface;
  return colors.primarySurface;
}
