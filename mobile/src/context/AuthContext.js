import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, setUnauthorizedHandler } from '../api/client';
import { usePushNotifications } from '../hooks/usePushNotifications';

const TOKEN_KEY = 'gametime_mobile_auth_token';
/** Set when a child completes family linking on-device (covers APIs that omit familyId on /auth/me). */
const CHILD_FAMILY_LINKED_KEY = 'gametime_mobile_child_family_linked';

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

async function setChildFamilyLinkedFlag(value) {
  if (Platform.OS === 'web') {
    if (value) await AsyncStorage.setItem(CHILD_FAMILY_LINKED_KEY, '1');
    else await AsyncStorage.removeItem(CHILD_FAMILY_LINKED_KEY);
    return;
  }
  if (value) await SecureStore.setItemAsync(CHILD_FAMILY_LINKED_KEY, '1');
  else await SecureStore.deleteItemAsync(CHILD_FAMILY_LINKED_KEY);
}

async function readChildFamilyLinkedFlag() {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(CHILD_FAMILY_LINKED_KEY);
  }
  return SecureStore.getItemAsync(CHILD_FAMILY_LINKED_KEY);
}

function childHasFamilyId(user) {
  if (!user || typeof user !== 'object') return false;
  const fid = user.familyId ?? user.family_id;
  return typeof fid === 'string' && fid.trim().length > 0;
}

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState('');
  const [role, setRole] = useState('guest');
  const [user, setUser] = useState(null);
  /** When true, signed-in child must complete Link Family before ChildStack (Supabase-first flow). */
  const [forceChildFamilyLink, setForceChildFamilyLink] = useState(false);

  // Registers the Expo push token with the backend whenever token changes
  // (covers both fresh login and session restore on app boot).
  // Returns unregisterPushToken so logout can deregister before clearing state.
  const { unregisterPushToken } = usePushNotifications(token);

  async function applyChildFamilyGate(me) {
    if (me.role !== 'child') {
      setForceChildFamilyLink(false);
      return;
    }
    const supabaseConfigured = Boolean(
      process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
    );
    if (!supabaseConfigured) {
      setForceChildFamilyLink(false);
      return;
    }
    const linkedLocally = Boolean(await readChildFamilyLinkedFlag());
    if (childHasFamilyId(me.user) || linkedLocally) {
      setForceChildFamilyLink(false);
    } else {
      setForceChildFamilyLink(true);
    }
  }

  async function hydrateFromToken(nextToken) {
    const me = await apiRequest('/auth/me', { token: nextToken });
    setToken(nextToken);
    setRole(me.role);
    setUser(me.user);
    await applyChildFamilyGate(me);
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
    await applyChildFamilyGate(me);
  }

  /** Call after Supabase successfully sets child_profiles.family_id so RootNavigator can show ChildStack. */
  async function markChildFamilyLinked() {
    await setChildFamilyLinkedFlag(true);
    setForceChildFamilyLink(false);
  }

  async function clearLocalGametimeData() {
    await unregisterPushToken(token);
    try {
      if (token) await apiRequest('/auth/logout', { method: 'POST', token });
    } catch {
      /* ignore */
    }
    await clearToken();
    await setChildFamilyLinkedFlag(false);
    setToken('');
    setRole('guest');
    setUser(null);
    setForceChildFamilyLink(false);
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
    await setChildFamilyLinkedFlag(false);
    setToken('');
    setRole('guest');
    setUser(null);
    setForceChildFamilyLink(false);
  }

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearToken();
      await setChildFamilyLinkedFlag(false);
      setToken('');
      setRole('guest');
      setUser(null);
      setForceChildFamilyLink(false);
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
        await setChildFamilyLinkedFlag(false);
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
    forceChildFamilyLink,
    loginWithToken,
    refreshMe,
    markChildFamilyLinked,
    logout,
    clearLocalGametimeData
  }), [booting, token, role, user, forceChildFamilyLink]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
