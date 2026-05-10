import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { CHILD_THEME } from '../../theme/childTheme';

type Props = {
  minutes: number;
  style?: StyleProp<TextStyle>;
};

function formatMins(n: number): string {
  if (n === 1) return '1 MIN';
  return `${n} MINS`;
}

export function DataGauge({ minutes, style }: Props) {
  const line = `/// TIME: ${formatMins(minutes)} ///`;

  return (
    <Text style={[styles.gauge, style]} accessibilityLabel={`Time remaining ${minutes} minutes`}>
      {line}
    </Text>
  );
}

const styles = StyleSheet.create({
  gauge: {
    ...CHILD_THEME.monoReg,
    color: CHILD_THEME.text,
    backgroundColor: CHILD_THEME.bg,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: CHILD_THEME.border,
  },
});
