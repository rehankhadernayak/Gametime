import { StyleSheet, Text, View } from 'react-native';

export default function Banner({ message = '', tone = 'error' }) {
  if (!message) return null;
  const isSuccess = tone === 'success';
  return (
    <View style={[styles.base, isSuccess ? styles.success : styles.error]}>
      <Text style={isSuccess ? styles.successText : styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  error: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F5C2C0'
  },
  success: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#A8DAB5'
  },
  errorText: {
    color: '#B3261E'
  },
  successText: {
    color: '#188038'
  }
});
