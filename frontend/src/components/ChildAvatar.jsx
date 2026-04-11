import { useEffect, useRef, useState } from 'react';
import './ChildAvatar.css';

const API_BASE = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

/**
 * ChildAvatar — displays a child's avatar photo or a fallback initial-letter circle.
 *
 * Props:
 *   childId   — number / string (required)
 *   name      — string — used for the fallback initial and alt text
 *   token     — JWT string
 *   size      — 'sm' | 'md' | 'lg'  (default 'md')
 *   onUpload  — optional callback(file) — when provided, clicking the avatar opens
 *               a file picker and calls onUpload with the selected File object.
 *               The parent is responsible for the actual POST request so it can
 *               show its own toasts / refresh its own state.
 */
export default function ChildAvatar({ childId, name = '', token, size = 'md', onUpload }) {
  const [src, setSrc] = useState(null);
  const [errored, setErrored] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!childId || !token) return;
    let objectUrl = null;
    let cancelled = false;
    setSrc(null);
    setErrored(false);

    fetch(`${API_BASE}/api/children/${childId}/avatar`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (cancelled) return null;
        if (!r.ok) { setErrored(true); return null; }
        return r.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => { if (!cancelled) setErrored(true); });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [childId, token]);

  const initial = (name || '?').charAt(0).toUpperCase();
  const hasPhoto = src && !errored;
  const clickable = !!onUpload;

  function handleClick() {
    if (onUpload && inputRef.current) inputRef.current.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      // Bust the blob cache so the new avatar shows
      setSrc(null);
      setErrored(false);
      // Re-fetch after a brief moment (parent may still be committing)
      setTimeout(() => {
        let objectUrl = null;
        fetch(`${API_BASE}/api/children/${childId}/avatar`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.blob() : null))
          .then((blob) => {
            if (!blob) return;
            objectUrl = URL.createObjectURL(blob);
            setSrc(objectUrl);
          })
          .catch(() => setErrored(true));
      }, 600);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <span
      className={`child-avatar child-avatar--${size}${clickable ? ' child-avatar--clickable' : ''}`}
      onClick={clickable ? handleClick : undefined}
      title={clickable ? `Change ${name}'s photo` : name}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
    >
      {hasPhoto ? (
        <img src={src} alt={name} className="child-avatar__img" />
      ) : (
        <span className="child-avatar__initial" aria-label={name}>{initial}</span>
      )}

      {clickable && (
        <>
          {uploading && <span className="child-avatar__overlay">…</span>}
          {!uploading && (
            <span className="child-avatar__overlay child-avatar__overlay--edit" aria-hidden="true">✎</span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </>
      )}
    </span>
  );
}
