import { StyleSheet, Text, View } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

const COPY = {
  system_ok: 'SYSTEM_OK',
  user_logged_in: 'USER_LOGGED_IN'
};

/**
 * Terminal-style metadata strip (website-style technical readout).
 * @param {{ variant?: 'system_ok' | 'user_logged_in', style?: import('react-native').ViewStyle }} props
 */
export default function StatusLine({ variant = 'system_ok', style }) {
  const label = COPY[variant] ?? COPY.system_ok;

  return (
    <View style={[styles.row, style]} accessibilityRole="text">
      <View style={styles.bar} />
      <Text style={styles.meta}>{label}</Text>
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%'
  },
  bar: {
    flex: 1,
    height: ONE_BIT.borderWidth,
    backgroundColor: ONE_BIT.ink
  },
  meta: {
    flexShrink: 0,
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  }
});
