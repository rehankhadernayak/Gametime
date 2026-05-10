import { StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { ONE_BIT, monoFont } from '../theme/oneBit';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export function MobileInput({ label, error = '', containerStyle, style, ...props }: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { fontFamily: monoFont.semibold }]}>{label}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          { fontFamily: monoFont.regular },
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor="#666666"
        selectionColor={ONE_BIT.ink}
        {...props}
      />
      {error ? (
        <Text style={[styles.errorText, { fontFamily: monoFont.regular }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: ONE_BIT.ink,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    borderRadius: ONE_BIT.radius,
    backgroundColor: ONE_BIT.bg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: ONE_BIT.ink,
    fontSize: 15,
    minHeight: 48,
  },
  inputError: {
    borderColor: ONE_BIT.ink,
  },
  errorText: {
    color: ONE_BIT.ink,
    fontSize: 12,
  },
});
