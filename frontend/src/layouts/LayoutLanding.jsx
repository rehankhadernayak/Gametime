/**
 * LayoutLanding
 * 
 * Full-Viewport Immersive Experience
 * - 100vw × 100vh hero sequence
 * - StringTune physics engine
 * - Textured parallax layers for 3D depth
 * - Center-stage cinematic composition
 * 
 * NO standard grids. Avant-garde, immersive layout.
 */

import styles from '../styles/landing.module.css';

export default function LayoutLanding({ children }) {
  return (
    <div className={styles.landingWrapper}>
      {/* Texture Layer 1: Dark Base (Slowest parallax) */}
      <div
        className={styles.textureLayerBase}
        string="parallax"
        string-parallax="0.3"
        aria-hidden="true"
      />

      {/* Texture Layer 2: Noise Overlay */}
      <div
        className={styles.textureLayerNoise}
        string="parallax"
        string-parallax="0.5"
        aria-hidden="true"
      />

      {/* Texture Layer 3: Accent Color */}
      <div
        className={styles.textureLayerAccent}
        string="parallax"
        string-parallax="0.7"
        aria-hidden="true"
      />

      {/* Main Content (Front layer) */}
      <div className={styles.contentLayer}>
        {children}
      </div>
    </div>
  );
}
