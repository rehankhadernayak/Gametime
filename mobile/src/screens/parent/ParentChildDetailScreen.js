import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BrutalistHeader from '../../components/ui/BrutalistHeader';
import MobileButton from '../../components/ui/MobileButton';
import { ONE_BIT } from '../../components/ui/oneBitTheme';
import { useAuth } from '../../context/AuthContext';
import { createChildSupabaseClient, getSupabaseChildTableName } from '../../lib/supabase';

/**
 * Lightweight drill-down for a single child node (stack header shows ASCII title via navigator).
 */
export default function ParentChildDetailScreen({ navigation }) {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { childId, childName } = route.params || {};

  const [screenTimeMod, setScreenTimeMod] = useState(null);
  const [showFamilyPicker, setShowFamilyPicker] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);

  const safeName = String(childName || 'Child').trim();
  const nodeLabel = safeName.toUpperCase().replace(/\s+/g, '_');

  const persistSelection = useCallback(
    async (encodedSelectionJson) => {
      if (!childId) {
        Alert.alert('Missing child', 'No child id in route params.');
        return;
      }
      if (!token) {
        Alert.alert('Session required', 'Sign in again.');
        return;
      }
      const supabase = createChildSupabaseClient(token);
      if (!supabase) {
        Alert.alert('Unavailable', 'Supabase is not configured in this build (URL / anon key).');
        return;
      }

      const trimmed = encodedSelectionJson != null ? String(encodedSelectionJson).trim() : '';
      const payload = trimmed.length > 0 ? trimmed : null;

      setSavingSelection(true);
      try {
        const table = getSupabaseChildTableName();
        const now = new Date().toISOString();
        const { error } = await supabase
          .from(table)
          .update({ screen_time_selection: payload, updated_at: now })
          .eq('id', childId);

        if (error) throw error;
      } catch (e) {
        Alert.alert('Could not save restrictions', e?.message ?? String(e));
      } finally {
        setSavingSelection(false);
      }
    },
    [childId, token]
  );

  const handleConfigureRestrictions = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('iOS only', 'Screen Time app blocking is configured on a parent iPhone or iPad.');
      return;
    }

    try {
      let mod = screenTimeMod;
      if (!mod) {
        mod = await import('gametime-screen-time');
        setScreenTimeMod(mod);
      }

      const authorized = await mod.requestAuthorization();
      if (!authorized) {
        Alert.alert('Not authorized', 'Screen Time access was not granted.');
        return;
      }
      setShowFamilyPicker(true);
    } catch (e) {
      Alert.alert('Authorization failed', e?.message ?? String(e));
    }
  }, [screenTimeMod]);

  const FamilyPicker = screenTimeMod?.FamilyPicker;

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
      {Platform.OS === 'ios' ? (
        <MobileButton title="CONFIGURE_RESTRICTIONS" onPress={handleConfigureRestrictions} />
      ) : null}
      {savingSelection ? (
        <ActivityIndicator color={ONE_BIT.ink} style={styles.savingSpinner} />
      ) : null}
      {Platform.OS === 'ios' && showFamilyPicker && FamilyPicker ? (
        <View style={styles.pickerSection}>
          <Text style={styles.label}>SELECT_APPS_TO_BLOCK</Text>
          <FamilyPicker style={styles.familyPicker} onSelectionChange={persistSelection} />
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
  savingSpinner: {
    alignSelf: 'flex-start',
    marginTop: -8
  },
  pickerSection: {
    gap: 8
  },
  familyPicker: {
    minHeight: 420,
    width: '100%',
    borderWidth: ONE_BIT.borderWidth,
    borderColor: ONE_BIT.borderColor
  }
});
