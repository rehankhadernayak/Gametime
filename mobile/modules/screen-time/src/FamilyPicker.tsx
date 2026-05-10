import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, type NativeSyntheticEvent, type ViewProps } from 'react-native';

/** Payload keys match the native `EventDispatcher` dictionary in `FamilyPickerContainerView`. */
export type FamilySelectionChangePayload = {
  /** UTF-8 JSON from `JSONEncoder.encode(FamilyActivitySelection)`; pass to `applyShield` on iOS. */
  selectionData: string;
};

export type FamilyPickerProps = ViewProps & {
  onSelectionChange?: (selectionDataJson: string) => void;
};

const NativeFamilyPicker =
  Platform.OS === 'ios'
    ? requireNativeViewManager<FamilyPickerNativeProps>('GametimeScreenTime')
    : null;

type FamilyPickerNativeProps = ViewProps & {
  onSelectionChange?: (event: NativeSyntheticEvent<FamilySelectionChangePayload>) => void;
};

/**
 * iOS-only native view wrapping `FamilyActivityPicker`. On other platforms renders `null`.
 */
export function FamilyPicker({ onSelectionChange, ...viewProps }: FamilyPickerProps) {
  if (!NativeFamilyPicker) {
    return null;
  }

  const handleSelection = React.useCallback(
    (event: NativeSyntheticEvent<FamilySelectionChangePayload>) => {
      onSelectionChange?.(event.nativeEvent.selectionData);
    },
    [onSelectionChange]
  );

  return <NativeFamilyPicker {...viewProps} onSelectionChange={handleSelection} />;
}
