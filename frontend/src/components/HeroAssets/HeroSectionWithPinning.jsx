/**
 * HeroSectionWithPinning
 * Combines MasterControllerHiFi SVG + ScrollTrigger pinning animation.
 * Mounts animation on component load.
 */

import { useEffect, useRef } from 'react';
import MasterControllerHiFi from './MasterControllerHiFi';
import { initializeHeroPinning } from './MasterControllerHiFiAnimation';

/**
 * Hero section wrapper that manages pinning + SVG animation
 */
export const HeroSectionWithPinning = () => {
  const heroRef = useRef(null);
  const textRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    // Trigger pinning animation on mount
    if (heroRef.current && svgRef.current) {
      initializeHeroPinning(heroRef.current, textRef?.current, svgRef.current);
    }

    return () => {
      // Cleanup ScrollTrigger instances on unmount
      // Note: ScrollTrigger.getAll() can be used to clean up if needed
    };
  }, []);

  return (
    <span
      ref={heroRef}
      className="hero-pinning-container"
      style={{ display: 'contents' }}
    >
      {/* SVG container */}
      <div ref={svgRef} className="hero-controller-wrapper" style={{ display: 'inline-block' }}>
        <MasterControllerHiFi />
      </div>

      {/* Text for blur-to-focus sync - pass ref for animation */}
      <h1
        ref={textRef}
        className="hero-heading"
        id="hero-main-heading"
        style={{ willChange: 'filter, opacity, transform' }}
      >
        Screen time,<br /><span>earned.</span>
      </h1>
    </span>
  );
};

export default HeroSectionWithPinning;
