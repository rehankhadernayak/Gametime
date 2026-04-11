import { StyleSheet, Text, View } from 'react-native';
import { stateColor } from '../theme/colors';

export default function StatusPill({ state }) {
  const color = stateColor(state);
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{state || 'Unknown'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  text: {
    fontSize: 12,
    fontWeight: '700'
  }
});
