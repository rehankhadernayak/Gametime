import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export default function Screen({ children, scroll = true, testID, contentContainerStyle, ...rest }) {
  const insets = useSafeAreaInsets();

  if (scroll) {
    return (
      <ScrollView
        testID={testID}
        {...rest}
        contentContainerStyle={[
          styles.base,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.xl
          },
          contentContainerStyle
        ]}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View
      testID={testID}
      {...rest}
      style={[
        styles.base,
        {
          flex: 1,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.md
        }
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    gap: spacing.md
  }
});
