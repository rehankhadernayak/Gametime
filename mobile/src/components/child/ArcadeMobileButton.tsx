import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';
import { CHILD_THEME } from '../../theme/childTheme';

type Props = Omit<TouchableOpacityProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ArcadeMobileButton({
  children,
  style,
  textStyle,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const [pressed, setPressed] = useState(false);
  const inverted = pressed && !disabled;

  const handlePressIn = useCallback(
    (e: Parameters<NonNullable<TouchableOpacityProps['onPressIn']>>[0]) => {
      setPressed(true);
      onPressIn?.(e);
    },
    [onPressIn],
  );

  const handlePressOut = useCallback(
    (e: Parameters<NonNullable<TouchableOpacityProps['onPressOut']>>[0]) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [onPressOut],
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={1}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.touch,
        inverted ? styles.touchInverted : styles.touchIdle,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            styles.label,
            inverted ? styles.labelInverted : styles.labelIdle,
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    borderWidth: 4,
    borderColor: CHILD_THEME.border,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchIdle: {
    backgroundColor: CHILD_THEME.bg,
  },
  touchInverted: {
    backgroundColor: CHILD_THEME.text,
  },
  disabled: { opacity: 0.45 },
  label: {
    ...CHILD_THEME.monoBold,
    fontSize: 24,
    color: CHILD_THEME.text,
  },
  labelIdle: {
    color: CHILD_THEME.text,
  },
  labelInverted: {
    color: CHILD_THEME.bg,
  },
});
