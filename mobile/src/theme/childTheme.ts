import { MonoBold, MonoReg } from '../styles/theme';

/**
 * Child OS — 1-bit brutalist (paper + ink). Mirrors web shell after contrast fix.
 * Typography remains IBM Plex Mono via shared font tokens.
 */
export const CHILD_THEME = {
  bg: '#FFFFFF',
  text: '#000000',
  border: '#000000',
  monoBold: MonoBold,
  monoReg: MonoReg,
} as const;
