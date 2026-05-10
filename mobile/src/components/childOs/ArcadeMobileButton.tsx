import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { monoFont } from '../../theme/oneBit';
import { CHILD_OS } from './childOsTheme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Primary arcade action — white frame on black (Child OS). */
export function ArcadeMobileButton({ children, style, textStyle, disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }: { pressed: boolean }) => [
        styles.base,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.text, { fontFamily: monoFont.semibold }, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHILD_OS.background,
    borderWidth: 2,
    borderColor: CHILD_OS.border,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.82 },
  text: {
    color: CHILD_OS.ink,
    fontSize: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
