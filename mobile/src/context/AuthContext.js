import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, setUnauthorizedHandler } from '../api/client';
import { usePushNotifications } from '../hooks/usePushNotifications';

const TOKEN_KEY = 'gametime_mobile_auth_token';
const AuthContext = createContext(null);

async function saveToken(value) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(TOKEN_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, value);
}

async function readToken() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function clearToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState('');
  const [role, setRole] = useState('guest');
  const [user, setUser] = useState(null);

  // Registers the Expo push token with the backend whenever token changes
  // (covers both fresh login and session restore on app boot).
  // Returns unregisterPushToken so logout can deregister before clearing state.
  const { unregisterPushToken } = usePushNotifications(token);

  async function hydrateFromToken(nextToken) {
    const me = await apiRequest('/auth/me', { token: nextToken });
    setToken(nextToken);
    setRole(me.role);
    setUser(me.user);
  }

  async function loginWithToken(nextToken) {
    await saveToken(nextToken);
    await hydrateFromToken(nextToken);
  }

  async function refreshMe() {
    if (!token) return;
    const me = await apiRequest('/auth/me', { token });
    setRole(me.role);
    setUser(me.user);
  }

  async function logout() {
    // Deregister push token first so the device stops receiving notifications
    // for this session. Pass token explicitly — it gets cleared below.
    await unregisterPushToken(token);

    try {
      if (token) await apiRequest('/auth/logout', { method: 'POST', token });
    } catch {
      // Ignore logout errors and clear local state.
    }

    await clearToken();
    setToken('');
    setRole('guest');
    setUser(null);
  }

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearToken();
      setToken('');
      setRole('guest');
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await readToken();
        if (stored) {
          await hydrateFromToken(stored);
        }
      } catch {
        await clearToken();
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({
    booting,
    token,
    role,
    user,
    loginWithToken,
    refreshMe,
    logout
  }), [booting, token, role, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
