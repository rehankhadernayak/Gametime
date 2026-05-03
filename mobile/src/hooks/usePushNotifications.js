import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiRequest } from '../api/client';
import { navigationRef } from '../navigation/navigationRef';

// ─── Android notification channel ─────────────────────────────────────────────

const CHANNEL_ID = 'gametime-default';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Gametime Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED'
  });
}

// ─── Permission + token acquisition ───────────────────────────────────────────

/**
 * Request notification permissions and return the Expo push token string,
 * or null if permissions were denied or we're running in a simulator.
 */
async function acquireExpoPushToken() {
  // Push tokens require a physical device — simulators/emulators don't work.
  if (!Device.isDevice) {
    console.log('[push] Skipping push registration: not a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted');
    return null;
  }

  await ensureAndroidChannel();

  // projectId is required for production/EAS builds. For Expo Go development
  // it resolves automatically. Run `eas init` to obtain a projectId for builds.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {}
    );
    return data;
  } catch (err) {
    console.warn('[push] Could not get push token:', err.message);
    return null;
  }
}

// ─── Deep-link routing ────────────────────────────────────────────────────────

/**
 * Map a notification's data payload to the correct screen and navigate there.
 *
 * Routing priority:
 *   1. `data.type`          — precise type string set by the backend
 *   2. `data.recipientType` — role-based fallback to the home screen
 *
 * Screen names match what's declared in RootNavigator.js.
 * Tab screens live inside ParentTabs / ChildTabs stacks, so we use nested
 * navigation params: navigate('ParentTabs', { screen: 'ParentApprovals' })
 */
function navigateFromNotification(notification) {
  if (!navigationRef.isReady()) return;

  const data = notification?.request?.content?.data ?? {};
  const { type, recipientType } = data;

  // ── Parent routes ──────────────────────────────────────────────────────────
  // ParentStack → ParentTabs → tab screens
  if (type === 'task_submitted' || type === 'task_request' || type === 'task_dispute') {
    navigationRef.navigate('ParentTabs', { screen: 'ParentApprovals' });
    return;
  }
  if (type === 'reward_redeemed') {
    navigationRef.navigate('ParentRewards');
    return;
  }

  // ── Child routes ───────────────────────────────────────────────────────────
  // ChildStack → ChildTabs → tab screens
  if (
    type === 'task_approved' ||
    type === 'task_rejected' ||
    type === 'task_expired' ||
    type === 'task_cancelled' ||
    type === 'task_request_approved' ||
    type === 'task_request_rejected'
  ) {
    navigationRef.navigate('ChildTabs', { screen: 'ChildTasks' });
    return;
  }
  if (type === 'reward_fulfilled' || type === 'reward_giftcard') {
    navigationRef.navigate('ChildTabs', { screen: 'ChildRewards' });
    return;
  }
  if (type === 'reward_request_approved') {
    navigationRef.navigate('ChildRewardsStore');
    return;
  }
  if (type === 'achievement_unlocked') {
    navigationRef.navigate('ChildTabs', { screen: 'ChildHome' });
    return;
  }

  // ── Fallback: role home ────────────────────────────────────────────────────
  if (recipientType === 'Parent') {
    navigationRef.navigate('ParentTabs', { screen: 'ParentAiTab' });
  } else if (recipientType === 'Child') {
    navigationRef.navigate('ChildTabs', { screen: 'ChildHome' });
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages Expo push notification registration for the currently logged-in user.
 *
 * Usage:
 *   const { unregisterPushToken } = usePushNotifications(token);
 *   // Call unregisterPushToken(token) before logout.
 *
 * @param {string} token - The JWT auth token from AuthContext
 */
export function usePushNotifications(token) {
  // Keep a ref so logout can read the most recent push token even after
  // the effect cleanup runs.
  const pushTokenRef = useRef(null);

  useEffect(() => {
    if (!token) return; // Not logged in — nothing to register

    let mounted = true;

    (async () => {
      try {
        const pushToken = await acquireExpoPushToken();
        if (!pushToken || !mounted) return;

        pushTokenRef.current = pushToken;

        await apiRequest('/notifications/device-token', {
          method: 'POST',
          token,
          body: { deviceToken: pushToken }
        });

        console.log('[push] Device token registered:', pushToken.slice(0, 40) + '…');
      } catch (err) {
        console.warn('[push] Registration failed:', err.message);
      }
    })();

    // ── Foreground / background tap listener ──────────────────────────────
    const tapListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[push] Notification tapped');
      navigateFromNotification(response.notification);
    });

    // ── Cold-start: app was killed, opened via notification tap ──────────
    // getLastNotificationResponseAsync() returns the tapped notification if
    // the app launch was triggered by one. We wait briefly so the navigator
    // finishes mounting before we attempt navigation.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response || !mounted) return;
      console.log('[push] Cold-start notification detected');
      // Poll until the navigator is ready (usually < 500 ms after mount).
      const interval = setInterval(() => {
        if (navigationRef.isReady()) {
          clearInterval(interval);
          navigateFromNotification(response.notification);
        }
      }, 100);
      // Give up after 5 s to avoid running forever on edge cases.
      setTimeout(() => clearInterval(interval), 5000);
    });

    return () => {
      mounted = false;
      tapListener.remove();
    };
  }, [token]);

  /**
   * Call this before logout to deregister the device so notifications stop
   * arriving for the signed-out session.
   *
   * @param {string} authToken - Current JWT (must be passed explicitly because
   *   token state is cleared before the async logout chain finishes).
   */
  async function unregisterPushToken(authToken) {
    const pushToken = pushTokenRef.current;
    if (!pushToken || !authToken) return;
    pushTokenRef.current = null;

    try {
      await apiRequest('/notifications/device-token', {
        method: 'DELETE',
        token: authToken,
        body: { deviceToken: pushToken }
      });
    } catch (err) {
      // Best-effort — if this fails the token will be pruned automatically
      // the next time Expo reports it as DeviceNotRegistered.
      console.warn('[push] Unregister failed:', err.message);
    }
  }

  return { unregisterPushToken };
}
