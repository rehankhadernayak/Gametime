import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

export function useGamingBlocker(sessionId, onSessionDenied) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockCode, setBlockCode] = useState(null);
  const appState = useRef(AppState.currentState);
  const checkInterval = useRef(null);
  const { token } = useAuth();

  const performCheck = useCallback(async () => {
    if (!sessionId || !token) return;

    try {
      const result = await apiRequest('/gaming/sessions/check-in', {
        method: 'POST',
        token,
        body: { sessionId }
      });

      if (!result.allowed) {
        setIsBlocked(true);
        setBlockCode(result.code);
        onSessionDenied?.(result.code, result.reason);
      } else {
        setIsBlocked(false);
        setBlockCode(null);
      }
    } catch (err) {
      console.error('[useGamingBlocker] Check-in failed:', err);
      // On network error, don't block to avoid false positives
    }
  }, [token, sessionId, onSessionDenied]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      appState.current = state;
      // Extra check when returning to app
      if (state === 'active') {
        performCheck();
      }
    });

    return () => subscription?.remove();
  }, [performCheck]);

  useEffect(() => {
    // Initial check
    performCheck();

    // Poll every 5 seconds while session is active
    checkInterval.current = setInterval(performCheck, 5000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [performCheck]);

  const dismissBlock = useCallback(() => {
    setIsBlocked(false);
    setBlockCode(null);
  }, []);

  return {
    isBlocked,
    blockCode,
    dismissBlock
  };
}