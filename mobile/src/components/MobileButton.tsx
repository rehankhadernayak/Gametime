import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { ONE_BIT } from '../theme/oneBit';
import { MonoBold } from '../styles/global';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  /** String/number use label typography; other nodes render inside the pressable as-is. */
  children: ReactNode;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function MobileButton({
  children,
  variant = 'primary',
  style,
  textStyle,
  disabled,
  ...rest
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            styles.text,
            variant === 'primary' && styles.textPrimary,
            variant === 'secondary' && styles.textSecondary,
            variant === 'ghost' && styles.textGhost,
            MonoBold,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: ONE_BIT.radius,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: ONE_BIT.ink,
    borderColor: ONE_BIT.ink,
  },
  secondary: {
    backgroundColor: ONE_BIT.bg,
  },
  ghost: {
    backgroundColor: ONE_BIT.bg,
    borderColor: 'transparent',
    paddingVertical: 8,
    minHeight: 40,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  text: { fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  textPrimary: { color: ONE_BIT.bg },
  textSecondary: { color: ONE_BIT.ink },
  textGhost: { color: ONE_BIT.ink, textDecorationLine: 'underline' },
});
