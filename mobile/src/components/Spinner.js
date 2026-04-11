import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Spinner — inline or full-screen loading indicator.
 * Props:
 *   full    {boolean} — fills available space and centers (default false)
 *   size    {string}  — 'small' | 'large' (default 'large')
 *   color   {string}  — override tint color
 */
export default function Spinner({ full = false, size = 'large', color = colors.primary }) {
  if (full) {
    return (
      <View style={styles.fullWrap}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }
  return <ActivityIndicator size={size} color={color} style={styles.inline} />;
}

const styles = StyleSheet.create({
  fullWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  inline: {
    alignSelf: 'center',
    marginVertical: 12
  }
});
