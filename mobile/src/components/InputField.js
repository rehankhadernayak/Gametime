import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

export default function InputField({ label, error = '', style, ...props }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.errorInput : null, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    color: colors.text,
    fontWeight: '600',
    flexWrap: 'wrap',
    lineHeight: 20,
    paddingRight: 2,
    paddingBottom: 1
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    lineHeight: 20,
    minHeight: 44
  },
  errorInput: {
    borderColor: colors.danger
  },
  errorText: {
    color: colors.danger,
    fontSize: 12
  }
});
