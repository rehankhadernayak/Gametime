import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function Button({ title, onPress, loading = false, disabled = false, tone = 'primary' }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        tone === 'secondary' ? styles.secondary : styles.primary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed
      ]}
    >
      {loading ? <ActivityIndicator color={tone === 'secondary' ? colors.text : '#fff'} /> : <Text style={[styles.label, tone === 'secondary' && styles.secondaryLabel]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  disabled: {
    opacity: 0.6
  },
  pressed: {
    opacity: 0.85
  },
  label: {
    color: '#fff',
    fontWeight: '700'
  },
  secondaryLabel: {
    color: colors.text
  }
});
