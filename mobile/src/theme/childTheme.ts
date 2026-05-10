import { MonoBold, MonoReg } from '../styles/theme';

/**
 * Child OS — inverted arcade palette (mirrors web child dashboard).
 * Typography remains IBM Plex Mono via shared font tokens.
 */
export const CHILD_THEME = {
  bg: '#000000',
  text: '#FFFFFF',
  border: '#FFFFFF',
  monoBold: MonoBold,
  monoReg: MonoReg,
} as const;
