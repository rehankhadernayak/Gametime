import { StyleSheet, Text, View } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

/**
 * ASCII-framed title for 1-bit surfaces. Use `compact` in native stack header titles.
 */
export default function OneBitAsciiHeader({ title, compact = false, style }) {
  const raw = String(title ?? '').trim() || 'UNKNOWN';
  const safe = raw.toUpperCase().replace(/\s+/g, '_').slice(0, 22);

  if (compact) {
    return (
      <View style={[styles.compactWrap, style]} accessibilityRole="header">
        <Text style={styles.compactText} numberOfLines={1}>
          {'/// '}{safe}{' ///'}
        </Text>
      </View>
    );
  }

  const innerW = Math.max(safe.length + 2, 12);
  const top = `+${'-'.repeat(innerW)}+`;
  const mid = `| ${safe.padEnd(innerW - 2)} |`;
  const bot = `+${'-'.repeat(innerW)}+`;

  return (
    <View style={[styles.boxWrap, style]} accessibilityRole="header">
      <Text style={styles.boxLine}>{top}</Text>
      <Text style={styles.boxLine}>{mid}</Text>
      <Text style={styles.boxLine}>{bot}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  compactWrap: {
    justifyContent: 'center',
    maxWidth: 280
  },
  compactText: {
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontBold,
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  boxWrap: {
    gap: 0,
    paddingVertical: 4
  },
  boxLine: {
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 12,
    letterSpacing: 0,
    textAlign: 'center'
  }
});
