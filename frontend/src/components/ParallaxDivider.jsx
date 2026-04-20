/**
 * Parallax Divider Component
 * Large background text moves at different speed than foreground
 * Creates visual depth and guides section transitions
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/kinetic-parallax-divider.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * ParallaxDivider Component
 * Creates a stunning transition between sections with parallax motion
 *
 * @param {Object} props - Component props
 * @param {string} props.text - Large background text (e.g., "CONCENTRATE")
 * @param {string} props.foregroundText - Optional foreground text
 * @param {React.ReactNode} props.children - Content to display in foreground
 * @param {number} props.bgSpeedRatio - Background parallax speed multiplier (0-1, default: 0.3)
 * @param {number} props.fgSpeedRatio - Foreground parallax speed multiplier (default: 0.6)
 * @param {string} props.accentColor - Accent color for background text (default: neon-blue)
 * @param {boolean} props.enableScroll - Enable scroll parallax (default: true)
 */
export function ParallaxDivider({
  text = 'CONCENTRATE',
  foregroundText = '',
  children = null,
  bgSpeedRatio = 0.3,
  fgSpeedRatio = 0.6,
  accentColor = 'var(--neon-blue)',
  enableScroll = true,
}) {
  const bgRef = useRef(null);
  const fgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enableScroll || !bgRef.current || !fgRef.current) return;

    const bgElement = bgRef.current;
    const fgElement = fgRef.current;

    // Background parallax (slower movement)
    gsap.to(bgElement, {
      y: () => window.innerHeight * -bgSpeedRatio,
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
        markers: false,
      },
    });

    // Foreground parallax (faster movement)
    gsap.to(fgElement, {
      y: () => window.innerHeight * -fgSpeedRatio,
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.5,
        markers: false,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [enableScroll, bgSpeedRatio, fgSpeedRatio]);

  return (
    <div ref={containerRef} className="parallax-divider-container">
      {/* Background layer - slowest */}
      <div ref={bgRef} className="parallax-bg">
        <h2 className="parallax-text" style={{ color: accentColor }}>
          {text}
        </h2>
      </div>

      {/* Middle layer - medium speed (optional foreground text) */}
      {foregroundText && (
        <div className="parallax-fg-text">
          <h3>{foregroundText}</h3>
        </div>
      )}

      {/* Foreground layer - contains actual content */}
      <div ref={fgRef} className="parallax-fg">
        <div className="parallax-content">
          {children}
        </div>
      </div>

      {/* Glassmorphic overlay for depth */}
      <div className="parallax-overlay" />
    </div>
  );
}

export default ParallaxDivider;
