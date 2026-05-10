import { View, Text, StyleSheet } from 'react-native';
import { MobileButton } from './MobileButton';
import { ONE_BIT, monoFont } from '../theme/oneBit';

type Props = {
  /** Second line: route / context, web-nav style */
  routeLine: string;
  showBack?: boolean;
  onBack?: () => void;
};

/**
 * Text-only ASCII-inspired chrome (Gametime + pipe grid), aligned with web nav tone.
 */
export function OneBitAsciiHeader({ routeLine, showBack, onBack }: Props) {
  return (
    <View style={[styles.wrap, styles.sepBottom]}>
      <Text style={[styles.pre, { fontFamily: monoFont.regular }]} selectable={false}>
        {`+-- GAMETIME --+  PARENT  |  SG`}
      </Text>
      <Text style={[styles.pre, { fontFamily: monoFont.regular }]} selectable={false}>
        {`|  ${String(routeLine).padEnd(36).slice(0, 36)}  |`}
      </Text>
      <Text style={[styles.pre, { fontFamily: monoFont.regular }]} selectable={false}>
        +----------------------------------+
      </Text>
      {showBack && onBack ? (
        <View style={styles.backRow}>
          <MobileButton variant="ghost" onPress={onBack} textStyle={styles.backBtnText}>
            {'[<-- BACK]'}
          </MobileButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: ONE_BIT.bg,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sepBottom: {
    borderBottomWidth: ONE_BIT.borderWidth,
    borderBottomColor: ONE_BIT.borderColor,
  },
  pre: {
    color: ONE_BIT.ink,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
  },
  backRow: { marginTop: 6, alignItems: 'flex-start' },
  backBtnText: { fontSize: 12, textTransform: 'none', letterSpacing: 0 },
});
