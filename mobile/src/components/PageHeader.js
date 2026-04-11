import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

/**
 * PageHeader — screen title + optional subtitle.
 * Props:
 *   title     {string} — required
 *   subtitle  {string} — optional
 *   accent    {string} — 'parent' (default, terracotta) | 'child' (green)
 */
export default function PageHeader({ title, subtitle, accent = 'parent' }) {
  const titleColor = accent === 'child' ? colors.childAccentDark : colors.primaryDark;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20
  }
});
