import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export default function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  tone = 'primary'
}) {
  const isDisabled = disabled || loading;
  const isSecondary = tone === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.text : '#fff'} />
      ) : (
        <Text style={[styles.text, isSecondary && styles.secondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 20,
    paddingHorizontal: 2
  },
  secondaryText: {
    color: colors.text
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.6
  }
});
