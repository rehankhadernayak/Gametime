import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrutalistHeader from '../../components/ui/BrutalistHeader';
import MobileButton from '../../components/ui/MobileButton';
import { ONE_BIT } from '../../components/ui/oneBitTheme';

/**
 * Lightweight drill-down for a single child node (stack header shows ASCII title via navigator).
 */
export default function ParentChildDetailScreen({ navigation }) {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route.params || {};

  const safeName = String(childName || 'Child').trim();
  const nodeLabel = safeName.toUpperCase().replace(/\s+/g, '_');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <BrutalistHeader title={`NODE_${nodeLabel}`} />
      <View style={styles.block}>
        <Text style={styles.label}>CHILD_ID</Text>
        <Text style={styles.value} selectable>
          {childId || '—'}
        </Text>
      </View>
      <MobileButton title="GAMING_CONTROLS" onPress={() => navigation.navigate('ParentGaming')} />
      <MobileButton title="TASK_MATRIX" onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentTasks' })} />
      <MobileButton
        title="FAMILY_NODE_LIST"
        onPress={() => navigation.navigate('ParentTabs', { screen: 'ParentChildren' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: ONE_BIT.background
  },
  content: {
    padding: 16,
    gap: 16
  },
  block: {
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    padding: 12,
    gap: 6
  },
  label: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    letterSpacing: 0.5,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  value: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 13,
    color: ONE_BIT.ink
  }
});
