import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

/**
 * 1-bit primary action: bordered tile, bold uppercase mono label.
 * Press state inverts ink/background; use activeOpacity={1} (default) for a hard invert without fade.
 */
export default function MobileButton({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  activeOpacity = 1,
  ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const showInvert = pressed && !disabled;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.shell,
        showInvert && styles.shellInverted,
        disabled && styles.shellDisabled,
        style
      ]}
      {...rest}
    >
      <Text
        style={[
          styles.label,
          showInvert && styles.labelInverted,
          disabled && styles.labelDisabled,
          textStyle
        ]}
        numberOfLines={1}
      >
        {String(title).toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ONE_BIT.background,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderRadius: ONE_BIT.radius
  },
  shellInverted: {
    backgroundColor: ONE_BIT.ink
  },
  shellDisabled: {
    opacity: 0.45
  },
  label: {
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontBold,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  labelInverted: {
    color: ONE_BIT.background
  },
  labelDisabled: {
    opacity: 1
  }
});
