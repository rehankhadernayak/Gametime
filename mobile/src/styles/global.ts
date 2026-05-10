import { StyleSheet } from 'react-native';
import { COLORS, MonoBold } from './theme';

export const globalStyles = StyleSheet.create({
  BrutalBox: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 0,
    padding: 16,
    backgroundColor: COLORS.bg,
  },
  PrimaryButton: {
    backgroundColor: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  PrimaryButtonText: {
    ...MonoBold,
    color: COLORS.bg,
    fontSize: 16,
  },
});
