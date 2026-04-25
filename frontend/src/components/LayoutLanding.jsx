import { useEffect } from 'react';
import StringTune from '@fiddle-digital/string-tune';
import styles from '../styles/landing.module.css';

/**
 * LayoutLanding
 * --------------------------------------------------------------------------
 * Wraps the public marketing surface (currently `/`).
 *
 * Responsibilities:
 *   1. Loads `landing.module.css`, which scopes the cinematic aesthetic
 *      (white canvas, agency kerning, overflow lock) to this surface only.
 *   2. Boots the StringTune singleton with the heavy "agency weight"
 *      configuration: smooth scroll ON, speed 0.8.
 *   3. Tears the engine down on unmount so navigating into the dashboard
 *      restores native scrolling (the dashboard layout never touches it).
 *
 * Children render inside `.root`. Phase-2 will move HomePage's internal
 * markup onto a 500vh pinned hero + bento driven by `data-string-*`.
 */
export default function LayoutLanding({ children }) {
  useEffect(() => {
    const stringTune = StringTune.getInstance();

    stringTune.setupSettings({
      smoothScroll: true,
      speed: 0.8,
    });

    stringTune.speed = 0.8;
    stringTune.scrollDesktopMode = 'smooth';
    stringTune.scrollMobileMode = 'default';

    stringTune.start(60);

    return () => {
      try {
        stringTune.destroy();
      } catch {
        // The singleton may already be torn down on hot-reload; ignore.
      }
    };
  }, []);

  return <div className={styles.root}>{children}</div>;
}
