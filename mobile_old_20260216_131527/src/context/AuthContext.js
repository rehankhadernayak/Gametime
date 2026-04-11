import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

const TOKEN_KEY = 'sidequest_mobile_token';

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false
      })
    });
  } catch {
    // Notification handlers are best-effort and optional for non-native web runtime.
  }
}

const AuthContext = createContext(null);

async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) return null;

    const settings = await Notifications.getPermissionsAsync();
    let finalStatus = settings.status;
    if (finalStatus !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token?.data || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState('');
  const [role, setRole] = useState('guest');
  const [user, setUser] = useState(null);
  const [pushToken, setPushToken] = useState('');

  async function hydrateFromToken(nextToken) {
    const me = await apiRequest('/auth/me', { token: nextToken });
    setRole(me.role);
    setUser(me.user);
  }

  async function loginWithToken(nextToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, nextToken);
    setToken(nextToken);
    await hydrateFromToken(nextToken);
  }

  async function refreshMe() {
    if (!token) return;
    await hydrateFromToken(token);
  }

  async function logout() {
    try {
      if (token) await apiRequest('/auth/logout', { method: 'POST', token });
    } catch {
      // If server token is invalid, clear local session anyway.
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken('');
    setRole('guest');
    setUser(null);
    setPushToken('');
  }

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          await hydrateFromToken(saved);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setToken('');
        setRole('guest');
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    registerForPushNotifications().then((value) => {
      if (value) setPushToken(value);
    });
  }, [token]);

  const value = useMemo(
    () => ({
      booting,
      token,
      role,
      user,
      pushToken,
      loginWithToken,
      logout,
      refreshMe
    }),
    [booting, token, role, user, pushToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
