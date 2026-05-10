import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, type NativeSyntheticEvent, type ViewProps } from 'react-native';

type NativeChangePayload = { selectionData: string };

const NativeFamilyPicker =
  Platform.OS === 'ios'
    ? requireNativeViewManager('GametimeScreenTime')
    : null;

export type FamilyPickerProps = ViewProps & {
  onSelectionChange?: (selectionData: string) => void;
};

export function FamilyPicker({ onSelectionChange, ...rest }: FamilyPickerProps) {
  if (!NativeFamilyPicker) {
    return null;
  }

  const handleSelectionChange = (event: NativeSyntheticEvent<NativeChangePayload>) => {
    onSelectionChange?.(event.nativeEvent.selectionData);
  };

  return <NativeFamilyPicker {...rest} onSelectionChange={handleSelectionChange} />;
}
