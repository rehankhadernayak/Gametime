import { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Banner from '../../components/Banner';
import BrutalistHeader from '../../components/ui/BrutalistHeader';
import MobileButton from '../../components/ui/MobileButton';
import { ONE_BIT } from '../../components/ui/oneBitTheme';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/format';

function tryLoadScreenTimeModule() {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('gametime-screen-time');
  } catch {
    return null;
  }
}

/**
 * Lightweight drill-down for a single child node (stack header shows ASCII title via navigator).
 */
export default function ParentChildDetailScreen({ navigation }) {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { childId, childName, hasScreenTimeSelection } = route.params || {};

  const [restrictionMessage, setRestrictionMessage] = useState('');
  const [restrictionError, setRestrictionError] = useState('');
  const [screenTimeAuthorized, setScreenTimeAuthorized] = useState(false);
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  const safeName = String(childName || 'Child').trim();
  const nodeLabel = safeName.toUpperCase().replace(/\s+/g, '_');

  const ScreenTimeFamilyPicker =
    Platform.OS === 'ios' ? tryLoadScreenTimeModule()?.FamilyPicker : null;

  const handleSelectionChange = useCallback(
    async (encodedSelectionJson) => {
      const trimmed = String(encodedSelectionJson || '').trim();
      if (!trimmed || !childId) return;

      setRestrictionMessage('');
      setRestrictionError('');
      setSavingSelection(true);
      try {
        await apiRequest(`/children/${childId}/screen-time-selection`, {
          method: 'PATCH',
          token,
          body: { encodedSelectionJson: trimmed }
        });
        setRestrictionMessage('BLOCKLIST_SYNCED');
      } catch (e) {
        setRestrictionError(getErrorMessage(e));
      } finally {
        setSavingSelection(false);
      }
    },
    [childId, token]
  );

  async function handleConfigureRestrictions() {
    setRestrictionMessage('');
    setRestrictionError('');
    if (Platform.OS !== 'ios') {
      setRestrictionError('Screen Time restrictions are configured from an iOS 16+ parent device.');
      return;
    }
    const screenTime = tryLoadScreenTimeModule();
    if (!screenTime?.requestAuthorization) {
      setRestrictionError('Screen Time module is not available on this build.');
      return;
    }
    if (!childId) {
      setRestrictionError('Missing child id.');
      return;
    }
    try {
      const ok = await screenTime.requestAuthorization();
      if (!ok) {
        setRestrictionError('Screen Time permission was not granted.');
        return;
      }
      setScreenTimeAuthorized(true);
      setShowFamilyPicker(true);
    } catch (e) {
      setRestrictionError(getErrorMessage(e));
    }
  }

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
      {Boolean(hasScreenTimeSelection) && (
        <Text style={styles.hint}>SCREEN_TIME_PAYLOAD_ON_SERVER</Text>
      )}
      <MobileButton title="CONFIGURE_RESTRICTIONS" onPress={handleConfigureRestrictions} />
      {savingSelection ? <Text style={styles.statusLine}>SAVING_SELECTION…</Text> : null}
      <Banner message={restrictionMessage} tone="success" />
      <Banner message={restrictionError} />
      {Platform.OS === 'ios' && screenTimeAuthorized && showFamilyPicker ? (
        <View style={styles.pickerBlock}>
          <Text style={styles.pickerHint}>SELECT_APPS_THEN_DONE_TO_SAVE</Text>
          <View style={styles.pickerHost}>
            {ScreenTimeFamilyPicker ? (
              <ScreenTimeFamilyPicker onSelectionChange={handleSelectionChange} style={styles.pickerFill} />
            ) : (
              <Text style={styles.hint}>SCREEN_TIME_NATIVE_UNAVAILABLE</Text>
            )}
          </View>
        </View>
      ) : null}
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
  },
  hint: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    letterSpacing: 0.4,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  statusLine: {
    fontFamily: ONE_BIT.fontBold,
    fontSize: 11,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  pickerBlock: {
    gap: 8
  },
  pickerHint: {
    fontFamily: ONE_BIT.fontRegular,
    fontSize: 10,
    letterSpacing: 0.4,
    color: ONE_BIT.ink,
    textTransform: 'uppercase'
  },
  pickerHost: {
    height: 420,
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor,
    overflow: 'hidden'
  },
  pickerFill: {
    flex: 1
  }
});
