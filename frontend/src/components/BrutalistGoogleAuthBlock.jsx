import { useCallback, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { apiRequest } from '../api/client.js';
import '../styles/brutalist-google.css';

/**
 * @param {{
 *   role: 'parent' | 'child';
 *   parentIntent?: 'signin' | 'signup';
 *   disabled?: boolean;
 *   onError: (message: string) => void;
 *   onAuthed: (data: object) => void | Promise<void>;
 * }} props
 */
export default function BrutalistGoogleAuthBlock({ role, parentIntent, disabled, onError, onAuthed }) {
  const [busy, setBusy] = useState(false);

  const exchange = useCallback(
    async (idToken, accessToken) => {
      const body = { role, idToken, accessToken };
      if (role === 'parent') body.intent = parentIntent;
      const data = await apiRequest('/auth/google', { method: 'POST', body });
      await onAuthed(data);
    },
    [onAuthed, parentIntent, role]
  );

  const googleLogin = useGoogleLogin({
    scope: 'openid email profile',
    onSuccess: async (tokenResponse) => {
      setBusy(true);
      try {
        const idToken = tokenResponse.id_token;
        const accessToken = tokenResponse.access_token;
        if (!idToken && !accessToken) {
          onError('Google did not return a usable token. Try again or update the app.');
          return;
        }
        await exchange(idToken || undefined, accessToken);
      } catch (err) {
        onError(err?.message || 'Google sign-in failed.');
      } finally {
        setBusy(false);
      }
    },
    onError: () => {
      onError('Google sign-in was cancelled or failed.');
    }
  });

  return (
    <>
      <button
        type="button"
        className="brutalist-google-btn"
        disabled={disabled || busy}
        onClick={() => googleLogin()}
      >
        <span className="brutalist-google-g" aria-hidden>
          G
        </span>
        Continue with Google
      </button>
      <div className="brutalist-oauth-or" aria-hidden>
        OR
      </div>
    </>
  );
}
