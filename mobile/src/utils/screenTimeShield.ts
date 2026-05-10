import { Alert, Platform } from 'react-native';
import { applyShield, removeShield } from 'gametime-screen-time';

/**
 * Apply Screen Time shield when a gaming session ends (timer, terminate, or remote denial).
 * No-op on non-iOS or when no serialized selection is stored.
 */
export async function applyShieldWhenSessionEnds(selectionJson: string | null | undefined): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;
  const data = typeof selectionJson === 'string' ? selectionJson.trim() : '';
  if (!data) return true;
  try {
    await applyShield(data);
    return true;
  } catch {
    Alert.alert('SYSTEM_RESTRICTION_ERROR', 'SYSTEM_RESTRICTION_ERROR');
    return false;
  }
}

/**
 * Clear shields when a new gaming session starts so games are playable.
 */
export async function removeShieldWhenSessionStarts(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await removeShield();
  } catch {
    // Starting play should not hard-fail if removal fails (e.g. nothing applied yet).
  }
}
