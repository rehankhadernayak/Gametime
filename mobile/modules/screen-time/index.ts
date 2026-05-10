import { requireNativeModule } from 'expo-modules-core';

type GametimeScreenTimeNative = {
  requestAuthorization(): Promise<boolean>;
  applyShield(selectionData: string): Promise<void>;
  removeShield(): Promise<void>;
};

const native = requireNativeModule<GametimeScreenTimeNative>('GametimeScreenTime');

export async function requestAuthorization(): Promise<boolean> {
  return native.requestAuthorization();
}

export async function applyShield(selectionData: string): Promise<void> {
  return native.applyShield(selectionData);
}

export async function removeShield(): Promise<void> {
  return native.removeShield();
}

export { FamilyPicker } from './src/FamilyPicker';
