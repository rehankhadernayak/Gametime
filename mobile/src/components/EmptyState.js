import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

/**
 * EmptyState — shown when a list has no items.
 * Props:
 *   icon     {string} — short text label shown above the title (default '—')
 *   title    {string} — required
 *   message  {string} — optional supporting text
 */
export default function EmptyState({ icon = '—', title, message }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm
  },
  icon: {
    fontSize: 36
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center'
  },
  message: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260
  }
});
