import { Platform } from 'react-native';

import { apiRequest } from '../api/client';

function tryLoadScreenTimeModule() {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('gametime-screen-time');
  } catch {
    return null;
  }
}

/**
 * Pulls the parent-configured FamilyActivitySelection payload from the API and applies it
 * via the native Screen Time shield. iOS only; no-ops elsewhere so Android never loads the native module.
 */
export async function syncSystemRestrictions(token) {
  if (Platform.OS !== 'ios' || !token) return;

  const screenTime = tryLoadScreenTimeModule();
  if (!screenTime?.applyShield || !screenTime?.removeShield) return;

  try {
    const data = await apiRequest('/children/screen-time-selection', { token });
    const encoded = data?.encodedSelectionJson;
    const trimmed = typeof encoded === 'string' ? encoded.trim() : '';
    if (trimmed) {
      await screenTime.applyShield(trimmed);
    } else {
      await screenTime.removeShield();
    }
  } catch {
    // Best-effort sync; avoid blocking child UI on network or decode failures.
  }
}
