import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useChildScreenTime } from '../../context/ChildScreenTimeContext';
import { GamingBlockOverlay } from '../../components/GamingBlockOverlay';
import { useGamingBlocker } from '../../hooks/useGamingBlocker';
import { monoFont } from '../../theme/oneBit';
import { getErrorMessage } from '../../utils/format';
import { applyShieldWhenSessionEnds } from '../../utils/screenTimeShield';
import { syncSystemRestrictions } from '../../utils/syncSystemRestrictions';
import { CHILD_OS, DataGauge } from '../../components/childOs';

const BG = CHILD_OS.background;

export type ChildSessionParams = {
  sessionId: string;
  expiresAt: string;
  grantedMinutes: number;
  gameName?: string;
};

type RootRoute = RouteProp<{ ChildSession: ChildSessionParams }, 'ChildSession'>;

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function ChildSession() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RootRoute>();
  const { token } = useAuth();
  const { sessionId, expiresAt, grantedMinutes, gameName } = route.params;

  const [remainingSec, setRemainingSec] = useState(() => {
    const end = Date.parse(expiresAt);
    return Math.max(0, Math.ceil((end - Date.now()) / 1000));
  });
  const [ending, setEnding] = useState(false);
  const expiryHandledRef = useRef(false);

  const { screenTimeSelectionJson } = useChildScreenTime();
  const { isBlocked, blockCode, dismissBlock } = useGamingBlocker(sessionId);

  useEffect(() => {
    if (isBlocked) expiryHandledRef.current = true;
  }, [isBlocked]);

  const startedMs = useMemo(() => Date.parse(expiresAt) - grantedMinutes * 60_000, [expiresAt, grantedMinutes]);

  useEffect(() => {
    const id = setInterval(() => {
      const end = Date.parse(expiresAt);
      setRemainingSec(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (!token) return;
    void syncSystemRestrictions(token);
  }, [token]);

  const actualMinutesForEnd = useCallback(() => {
    const elapsedMs = Math.max(0, Date.now() - startedMs);
    return Math.max(1, Math.min(grantedMinutes, Math.ceil(elapsedMs / 60_000)));
  }, [grantedMinutes, startedMs]);

  const endSessionOnDevice = useCallback(async () => {
    if (!token) return;
    await applyShieldWhenSessionEnds(screenTimeSelectionJson);
    await apiRequest('/gaming/sessions/end', {
      method: 'POST',
      token,
      body: { sessionId, actualMinutes: actualMinutesForEnd() },
    } as never);
    await syncSystemRestrictions(token);
  }, [actualMinutesForEnd, screenTimeSelectionJson, sessionId, token]);

  const onTerminate = useCallback(async () => {
    if (!token || ending) return;
    setEnding(true);
    try {
      await endSessionOnDevice();
      navigation.goBack();
    } catch (e) {
      setEnding(false);
      Alert.alert('Session', getErrorMessage(e));
    }
  }, [endSessionOnDevice, ending, navigation, token]);

  useEffect(() => {
    if (remainingSec > 0 || ending || expiryHandledRef.current || !token || isBlocked) return;
    expiryHandledRef.current = true;
    let cancelled = false;
    setEnding(true);
    void (async () => {
      try {
        await endSessionOnDevice();
        if (!cancelled) navigation.goBack();
      } catch (e) {
        expiryHandledRef.current = false;
        if (!cancelled) {
          setEnding(false);
          Alert.alert('Session', getErrorMessage(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remainingSec, ending, token, isBlocked, endSessionOnDevice, navigation]);

  const { height: winH } = Dimensions.get('window');
  const timerAreaMinH = winH * 0.48;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style="dark" />
      <View style={[styles.timerRegion, { minHeight: timerAreaMinH, paddingTop: insets.top + 12 }]}>
        <Text
          style={[styles.countdown, { fontFamily: monoFont.bold }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.06}
        >
          {formatClock(remainingSec)}
        </Text>
        {gameName ? (
          <Text style={[styles.game, { fontFamily: monoFont.regular }]} numberOfLines={1}>
            {`// ${gameName}`}
          </Text>
        ) : null}
      </View>

      <View style={styles.mid}>
        <DataGauge label="NETWORK: SECURE" fill={7} total={8} />
      </View>

      <View style={{ flex: 1 }} />

      <GamingBlockOverlay
        visible={isBlocked}
        code={blockCode}
        onDismiss={() => {
          dismissBlock();
          navigation.goBack();
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Terminate gaming session"
        onPress={() => void onTerminate()}
        disabled={ending || isBlocked}
        style={({ pressed }: { pressed: boolean }) => [
          styles.terminateOuter,
          pressed && !ending && { opacity: 0.88 },
          ending && { opacity: 0.5 },
        ]}
      >
        {ending ? (
          <ActivityIndicator color={CHILD_OS.ink} />
        ) : (
          <Text style={[styles.terminateText, { fontFamily: monoFont.semibold }]}>TERMINATE SESSION</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 20,
  },
  timerRegion: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  countdown: {
    color: CHILD_OS.ink,
    fontSize: 120,
    lineHeight: 124,
    width: '100%',
    textAlign: 'center',
  },
  game: {
    marginTop: 12,
    color: CHILD_OS.muted,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  mid: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  terminateOuter: {
    borderWidth: 2,
    borderColor: CHILD_OS.dangerBorder,
    backgroundColor: BG,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  terminateText: {
    color: CHILD_OS.ink,
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
