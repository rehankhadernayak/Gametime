import { StyleSheet, Text, View } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

const COPY = {
  system_ok: 'SYSTEM_OK',
  user_logged_in: 'USER_LOGGED_IN'
};

/**
 * Terminal-style metadata strip (website-style technical readout).
 * Pass `status` and/or `lastSync` for telemetry (e.g. STATUS: ONLINE // LAST_SYNC: 2M_AGO).
 * @param {{
 *   variant?: 'system_ok' | 'user_logged_in',
 *   status?: string,
 *   lastSync?: string,
 *   message?: string,
 *   style?: import('react-native').ViewStyle
 * }} props
 */
export default function StatusLine({ variant = 'system_ok', status, lastSync, message, style }) {
  if (message != null && String(message).trim() !== '') {
    const label = String(message).toUpperCase();
    return (
      <View style={[styles.row, style]} accessibilityRole="text">
        <View style={styles.bar} />
        <Text style={styles.meta} numberOfLines={3}>
          {label}
        </Text>
        <View style={styles.bar} />
      </View>
    );
  }

  const hasTelemetry = status != null || lastSync != null;
  const label = hasTelemetry
    ? [
        status != null ? `STATUS: ${String(status).toUpperCase()}` : null,
        lastSync != null ? `LAST_SYNC: ${String(lastSync).toUpperCase()}` : null
      ]
        .filter(Boolean)
        .join(' // ')
    : COPY[variant] ?? COPY.system_ok;

  return (
    <View style={[styles.row, style]} accessibilityRole="text">
      <View style={styles.bar} />
      <Text style={styles.meta} numberOfLines={2}>
        {label}
      </Text>
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
    flexShrink: 1,
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  }
});
