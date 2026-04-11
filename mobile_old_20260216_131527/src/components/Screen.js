import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function Screen({ children, scroll = true, ...rest }) {
  const insets = useSafeAreaInsets();
  if (scroll) {
    return (
      <ScrollView
        {...rest}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }
        ]}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      {...rest}
      style={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.md
  }
});
