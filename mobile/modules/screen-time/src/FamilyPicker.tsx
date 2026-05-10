import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, type NativeSyntheticEvent, type ViewProps } from 'react-native';

export type FamilySelectionChangePayload = {
  /** UTF-8 JSON produced by `JSONEncoder` from `FamilyActivitySelection` (opaque tokens). */
  encodedSelection: string;
};

export type FamilyPickerProps = ViewProps & {
  /**
   * Called when the native `FamilyActivitySelection` changes. The string is JSON from `JSONEncoder`
   * and is suitable for persisting or passing to Managed Settings / Device Activity APIs later.
   */
  onSelectionChange?: (encodedSelectionJson: string) => void;
};

const NativeFamilyPicker =
  Platform.OS === 'ios'
    ? requireNativeViewManager<FamilyPickerNativeProps>('GametimeScreenTime')
    : null;

type FamilyPickerNativeProps = ViewProps & {
  onSelectionChange?: (event: NativeSyntheticEvent<FamilySelectionChangePayload>) => void;
};

/**
 * iOS-only native view that wraps `FamilyActivityPicker`. On other platforms renders `null`.
 */
export function FamilyPicker({ onSelectionChange, ...viewProps }: FamilyPickerProps) {
  if (!NativeFamilyPicker) {
    return null;
  }

  const handleSelection = React.useCallback(
    (event: NativeSyntheticEvent<FamilySelectionChangePayload>) => {
      onSelectionChange?.(event.nativeEvent.encodedSelection);
    },
    [onSelectionChange]
  );

  return <NativeFamilyPicker {...viewProps} onSelectionChange={handleSelection} />;
}
