import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CHILD_THEME } from '../../theme/childTheme';

type Props = {
  taskName: string;
  timeReward: string;
  completed?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function MissionBox({ taskName, timeReward, completed = false, style }: Props) {
  const mark = completed ? '[X]' : '[ ]';

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.mark, styles.monoReg]}>{mark}</Text>
      <Text style={[styles.name, styles.monoReg]} numberOfLines={2}>
        {taskName}
      </Text>
      <Text style={[styles.reward, styles.monoReg]}>{timeReward}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CHILD_THEME.bg,
    borderBottomWidth: 4,
    borderBottomColor: CHILD_THEME.border,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 10,
  },
  monoReg: CHILD_THEME.monoReg,
  mark: {
    color: CHILD_THEME.text,
    fontSize: 16,
    minWidth: 40,
  },
  name: {
    flex: 1,
    color: CHILD_THEME.text,
    fontSize: 15,
  },
  reward: {
    color: CHILD_THEME.text,
    fontSize: 14,
    textAlign: 'right',
  },
});
