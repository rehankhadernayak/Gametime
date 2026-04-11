import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function MessageBanner({ text, tone = 'error' }) {
  if (!text) return null;
  const style = tone === 'success' ? styles.success : styles.error;
  const textStyle = tone === 'success' ? styles.successText : styles.errorText;
  return (
    <View style={[styles.base, style]}>
      <Text style={textStyle}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    padding: spacing.sm
  },
  error: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F9C2BC'
  },
  success: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#B7DFBE'
  },
  errorText: {
    color: colors.danger
  },
  successText: {
    color: colors.success
  }
});
