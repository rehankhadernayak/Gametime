import type { TextStyle } from 'react-native';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_700Bold,
} from '@expo-google-fonts/ibm-plex-mono';

/**
 * 1-bit Design DNA — pass to `useFonts` / `loadAsync` before using MonoReg / MonoBold.
 */
export const BRUTAL_FONTS = {
  IBMPlexMono_400Regular,
  IBMPlexMono_700Bold,
} as const;

export const COLORS = {
  bg: '#FFFFFF',
  text: '#000000',
  border: '#000000',
  accent: '#000000',
} as const;

/** IBM Plex Mono — regular */
export const MonoReg: TextStyle = {
  fontFamily: 'IBMPlexMono_400Regular',
};

/** IBM Plex Mono — bold */
export const MonoBold: TextStyle = {
  fontFamily: 'IBMPlexMono_700Bold',
};
