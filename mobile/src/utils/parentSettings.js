import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'gametime_mobile_parent_settings';

export const DEFAULT_PARENT_SETTINGS = {
  defaultTaskPoints: 10,
  requireApprovalNotes: false
};

export async function loadParentSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_PARENT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      defaultTaskPoints: Number.isInteger(parsed?.defaultTaskPoints)
        ? Math.min(50, Math.max(5, parsed.defaultTaskPoints))
        : DEFAULT_PARENT_SETTINGS.defaultTaskPoints,
      requireApprovalNotes: Boolean(parsed?.requireApprovalNotes)
    };
  } catch {
    return DEFAULT_PARENT_SETTINGS;
  }
}

export async function saveParentSettings(settings) {
  const normalized = {
    defaultTaskPoints: Number.isInteger(settings?.defaultTaskPoints)
      ? Math.min(50, Math.max(5, settings.defaultTaskPoints))
      : DEFAULT_PARENT_SETTINGS.defaultTaskPoints,
    requireApprovalNotes: Boolean(settings?.requireApprovalNotes)
  };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}
