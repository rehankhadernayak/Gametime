import { StyleSheet, Text, View } from 'react-native';
import { ONE_BIT } from './oneBitTheme';

/**
 * Section header using ASCII-style rules instead of iconography.
 */
export default function BrutalistHeader({ title, style, textStyle }) {
  const line = title == null ? '' : String(title).trim().toUpperCase();

  return (
    <View style={[styles.block, style]} accessibilityRole="header">
      <Text style={[styles.rule, textStyle]} numberOfLines={1}>
        --- {line} ---
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: '100%',
    paddingVertical: 4
  },
  rule: {
    color: ONE_BIT.ink,
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 13,
    letterSpacing: 0.6,
    textAlign: 'center'
  }
});
