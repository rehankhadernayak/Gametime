import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { monoFont } from '../../theme/oneBit';
import { CHILD_OS } from './childOsTheme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  status: string;
  rewardLine?: string | null;
  style?: StyleProp<ViewStyle>;
};

/** Terminal-style mission row (Child OS). */
export function MissionBox({ title, status, rewardLine, style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }: { pressed: boolean }) => [styles.box, pressed && styles.pressed, style]}
      {...rest}
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, { fontFamily: monoFont.semibold }]} numberOfLines={2}>
          {title}
        </Text>
        {rewardLine ? (
          <Text style={[styles.reward, { fontFamily: monoFont.regular }]}>{rewardLine}</Text>
        ) : null}
      </View>
      <Text style={[styles.status, { fontFamily: monoFont.regular }]} numberOfLines={1}>
        {`> ${status}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: CHILD_OS.border,
    backgroundColor: CHILD_OS.background,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  pressed: { opacity: 0.88 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: CHILD_OS.ink,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  reward: {
    color: CHILD_OS.muted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  status: {
    color: CHILD_OS.muted,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
