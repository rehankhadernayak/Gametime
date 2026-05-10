import { StyleSheet, Text, View } from 'react-native';
import { monoFont } from '../../theme/oneBit';
import { CHILD_OS } from './childOsTheme';

type Props = {
  /** e.g. "NETWORK: SECURE" */
  label: string;
  /** Filled segment count 0–total (inclusive visual bar). */
  fill?: number;
  total?: number;
};

/** Monospace status gauge line (Child OS). */
export function DataGauge({ label, fill = 6, total = 8 }: Props) {
  const t = Math.max(1, total);
  const f = Math.min(Math.max(0, fill), t);
  const empty = t - f;
  const bar = `${'█'.repeat(f)}${'░'.repeat(empty)}`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.line, { fontFamily: monoFont.regular }]} selectable={false}>
        {`[${bar}]`}
      </Text>
      <Text style={[styles.label, { fontFamily: monoFont.semibold }]} selectable={false}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  line: {
    color: CHILD_OS.ink,
    fontSize: 13,
    letterSpacing: 1,
  },
  label: {
    color: CHILD_OS.ink,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
