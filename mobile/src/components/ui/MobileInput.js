import { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

const PADDING = 12;

/**
 * 1-bit text field: sharp rectangle, 2px black border, IBM Plex Mono.
 */
const MobileInput = forwardRef(function MobileInput(
  { style, placeholderTextColor = '#666666', ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor}
      style={[styles.input, style]}
      {...props}
    />
  );
});

export default MobileInput;

const styles = StyleSheet.create({
  input: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderRadius: ONE_BIT.radius,
    backgroundColor: ONE_BIT.background,
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 16,
    padding: PADDING,
    minHeight: 48
  }
});
